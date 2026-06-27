#!/usr/bin/env npx tsx

/**
 * PDF Generation Script
 *
 * Loads linearized articles from the article tree, builds a complete ebook HTML
 * document, renders it to PDF via Playwright (headless Chromium), and adds PDF
 * bookmarks (outlines) using pdf-lib post-processing.
 *
 * Usage:
 *   npx tsx scripts/generate-pdf.ts --locale en --output public/gtmc.pdf
 *   npx tsx scripts/generate-pdf.ts --locale zh
 *   npx tsx scripts/generate-pdf.ts                          # defaults: en, public/gtmc.pdf
 */

import { chromium } from "playwright"
import { PDFDocument } from "pdf-lib"
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { getArticleTree } from "@/lib/articles/manifest"
import {
  linearizeArticles,
  getArticleContentForPdf,
} from "@/lib/articles/linearize"
import type { LinearizedArticle } from "@/lib/articles/linearize"
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"
import type { ArticleLocale } from "@/lib/articles/manifest"
import { buildEbookHtml, resolveImagesInHtml } from "@/lib/pdf/ebook-structure"
import { buildOutlineTree, writePdfOutlines } from "@/lib/pdf/outline"
import { renderMarkdownToHtml } from "@/lib/pdf/markdown-pipeline"
import { createRehypeShiki } from "@/lib/markdown/syntax/rehype-shiki"
import type { RehypeShikiPlugin } from "@/lib/markdown/syntax/rehype-shiki"

// ── Types ───────────────────────────────────────────────────────────────────

interface CliOptions {
  locale: "en" | "zh" | "all"
  output: string
}

function sortChapterTree(nodes: ChapterNavNode[]) {
  nodes.sort((a: ChapterNavNode, b: ChapterNavNode) => {
    if (a.isPreface !== b.isPreface) return a.isPreface ? -1 : 1
    if (a.isFolder && b.isFolder && a.isAppendix !== b.isAppendix) {
      return a.isAppendix ? 1 : -1
    }
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
    if (!a.isFolder && a.isAppendix !== b.isAppendix) {
      return a.isAppendix ? 1 : -1
    }
    return a.title.localeCompare(b.title)
  })
  for (const node of nodes) {
    if (node.children.length) sortChapterTree(node.children)
  }
}

// ── CLI Parsing ─────────────────────────────────────────────────────────────

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  let locale: "en" | "zh" | "all" = "all"
  let output = ""

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--locale" && i + 1 < args.length) {
      const val = args[i + 1].toLowerCase()
      if (val === "en" || val === "zh" || val === "all") locale = val as any
      i++
    } else if (arg === "--output" && i + 1 < args.length) {
      output = path.resolve(process.cwd(), args[i + 1])
      i++
    }
  }

  if (!output && locale !== "all") {
    output = path.join(process.cwd(), "public", `gtmc-${locale}.pdf`)
  }

  return { locale, output }
}

// ── Content Scanning ────────────────────────────────────────────────────────

/**
 * Read each article once and compute everything we need from its content:
 * the set of fenced code-block languages, whether it contains math, and the
 * raw markdown body (returned so the renderer can reuse it without re-reading).
 */
async function analyzeArticle(
  article: LinearizedArticle,
  locale: ArticleLocale
): Promise<{ codeLangs: string[]; hasMath: boolean; body: string | null }> {
  try {
    const body = await getArticleContentForPdf(article.slug, locale)
    if (!body) return { codeLangs: [], hasMath: false, body: null }

    const codeLangs: string[] = []
    for (const m of body.matchAll(/^```(\w+)/gm)) {
      const lang = m[1].toLowerCase()
      if (lang !== "" && lang !== "text" && lang !== "plain") {
        codeLangs.push(lang)
      }
    }

    const hasMath =
      body.includes("$") || body.includes("\\(") || body.includes("\\[")

    return { codeLangs, hasMath, body }
  } catch {
    // Skip articles that fail to load during scanning
    return { codeLangs: [], hasMath: false, body: null }
  }
}

/**
 * Scan all articles once, returning the distinct code languages, whether any
 * article needs KaTeX, and a map of slug → body so the renderer can reuse the
 * already-read content.
 */
async function analyzeArticles(
  articles: LinearizedArticle[],
  locale: ArticleLocale
): Promise<{
  codeLangs: string[]
  hasMath: boolean
  bodies: Map<string, string>
}> {
  const allLangs = new Set<string>()
  let hasMath = false
  const bodies = new Map<string, string>()

  const results = await Promise.all(
    articles.map((article) => analyzeArticle(article, locale))
  )
  for (let i = 0; i < articles.length; i++) {
    const { codeLangs, hasMath: articleHasMath, body } = results[i]
    for (const lang of codeLangs) allLangs.add(lang)
    if (articleHasMath) hasMath = true
    if (body !== null) bodies.set(articles[i].slug, body)
  }

  return { codeLangs: [...allLangs], hasMath, bodies }
}

// ── Custom Article Renderer ─────────────────────────────────────────────────

/**
 * Factory that returns a renderArticle callback for `buildEbookHtml()`.
 * Each article's markdown is rendered through the PDF pipeline with optional
 * Shiki syntax highlighting. The body comes from the pre-read `bodies` map
 * produced during content scanning, so each file is read only once.
 */
function createRenderArticle(
  shikiPlugin: RehypeShikiPlugin | undefined,
  locale: ArticleLocale,
  bodies: Map<string, string>
) {
  return async (article: LinearizedArticle): Promise<string> => {
    try {
      const content = bodies.get(article.slug)
      if (!content) return ""

      const html = await renderMarkdownToHtml(content, {
        articlePath: article.filePath ?? undefined,
        articleSlug: article.slug,
        shikiPlugin,
      })

      // Resolve relative image paths to file:// URLs for Playwright
      return resolveImagesInHtml(html, article.filePath)
    } catch (error) {
      console.warn(
        `[pdf] Warning: failed to render article "${article.slug}":`,
        error
      )
      return ""
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function runPdf(locale: "en" | "zh", output: string): Promise<void> {
  console.log(`[pdf] Generating PDF (locale=${locale}, output=${output})`)

  // Ensure output directory exists
  const outDir = path.dirname(output)
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 1: Load article tree
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[pdf] Phase 1/6: Loading article tree...")
  let tree: ChapterNavNode[]
  try {
    tree = (await getArticleTree(locale)) as ChapterNavNode[]
  } catch (error) {
    throw new Error(`[pdf] Failed to load article tree: ${error}`, {
      cause: error,
    })
  }

  if (!tree || tree.length === 0) {
    console.warn(
      "[pdf] No articles found in tree (submodule may not be initialized). Skipping PDF generation."
    )
    return
  }

  sortChapterTree(tree)

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 2: Linearize
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[pdf] Phase 2/6: Linearizing articles...")
  const articles = await linearizeArticles(tree)
  console.log(`[pdf]   → ${articles.length} article(s) found`)

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 3: Scan content for code languages and math
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[pdf] Phase 3/6: Scanning article content...")

  let codeLangs: string[]
  let hasMath: boolean
  let bodies: Map<string, string>
  try {
    ;({ codeLangs, hasMath, bodies } = await analyzeArticles(articles, locale))
  } catch (error) {
    throw new Error(`[pdf] Failed to scan articles: ${error}`, {
      cause: error,
    })
  }

  if (codeLangs.length > 0) {
    console.log(`[pdf]   → Code languages: ${codeLangs.join(", ")}`)
  } else {
    console.log("[pdf]   → No code blocks detected")
  }
  console.log(`[pdf]   → Has math: ${hasMath}`)

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 4: Initialize Shiki highlighter
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[pdf] Phase 4/6: Initializing syntax highlighter...")
  let shikiPlugin: RehypeShikiPlugin | undefined
  if (codeLangs.length > 0) {
    try {
      shikiPlugin = await createRehypeShiki(codeLangs)
    } catch (error) {
      console.warn(
        "[pdf]   ⚠ Failed to initialize Shiki, continuing without highlighting:",
        error
      )
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 5: Build ebook HTML
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[pdf] Phase 5/6: Building ebook HTML...")

  const renderArticle = createRenderArticle(shikiPlugin, locale, bodies)

  let html: string
  try {
    html = await buildEbookHtml({
      title: "Graduate Texts in Minecraft",
      subtitle: "An Introduction to Technical Minecraft",
      meta: {
        Locale: locale === "en" ? "English" : "中文",
        Generated: new Date().toISOString().split("T")[0],
      },
      locale,
      articles,
      hasMath,
      renderArticle,
    })
  } catch (error) {
    throw new Error(`[pdf] Failed to build ebook HTML: ${error}`, {
      cause: error,
    })
  }

  console.log(
    `[pdf]   → HTML built (${(html.length / 1024 / 1024).toFixed(1)} MB)`
  )

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 6: Generate PDF via Playwright and add bookmarks
  // ═══════════════════════════════════════════════════════════════════════
  const tempPdfPath = output + ".tmp"
  const tempHtmlPath = path.join(outDir, `.gtmc-pdf-temp-${locale}.html`)

  console.log("[pdf] Phase 6/6: Generating PDF via Playwright...")

  const browser = await chromium
    .launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    })
    .catch((error) => {
      console.warn(
        "[pdf] Failed to launch Playwright, skipping PDF generation:",
        error
      )
      return null
    })

  if (!browser) return

  try {
    // Write HTML to a temp file so file:// images and CSS @import resolve
    fs.writeFileSync(tempHtmlPath, html, "utf-8")

    const context = await browser.newContext({ colorScheme: "light" })
    const page = await context.newPage()

    // Navigate to the temp HTML file so file:// URL images load properly
    await page.goto(pathToFileURL(tempHtmlPath).href, {
      waitUntil: "load",
    })

    // Wait for KaTeX font loading and PDF-specific font loading
    await page.waitForFunction(
      () =>
        document.fonts.ready.then(
          () =>
            document.fonts.check('16px "Geist"') &&
            document.fonts.check('16px "Geist Mono"') &&
            document.fonts.check('16px "Noto Sans SC"')
        ),
      { timeout: 30000 }
    )
    console.log(
      "[pdf]   → PDF fonts verified (Geist + Geist Mono + Noto Sans SC)"
    )

    // Force light theme for PDF rendering (scrollbars, form controls, etc.)
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light")
    })

    // ── Generate PDF ───────────────────────────────────────────────────────
    console.log("[pdf]   → Rendering PDF pages...")
    await page.pdf({
      path: tempPdfPath,
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      displayHeaderFooter: true,
      headerTemplate:
        '<div style="font-size:8pt; font-family:Geist Mono,monospace; color:#64748b; width:100%; text-align:center; padding-top:5px; letter-spacing:0.15em; text-transform:uppercase;">Graduate Texts in Minecraft</div>',
      footerTemplate:
        '<div style="font-size:8pt; font-family:Geist Mono,monospace; color:#64748b; width:100%; text-align:center; padding-top:5px;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    })

    console.log("[pdf]   → PDF written to temp file")
  } catch (error) {
    await browser.close()
    // Clean up temp HTML file on error
    try {
      if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath)
    } catch {
      /* ignore */
    }
    throw new Error(`[pdf] PDF generation failed: ${error}`, { cause: error })
  }

  await browser.close()

  try {
    // Comment this line to keep temp HTML file at public/.gtmc-pdf-temp.html for debugging/inspection
    if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath)
  } catch {
    // Ignore cleanup errors
  }

  // ── Add PDF bookmarks (outlines) ────────────────────────────────────────
  console.log("[pdf]   → Adding PDF bookmarks...")
  try {
    const pdfBytes = fs.readFileSync(tempPdfPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)

    const outlineTree = buildOutlineTree(articles)
    writePdfOutlines(pdfDoc, outlineTree)

    fs.writeFileSync(output, await pdfDoc.save())
    console.log("[pdf]   → Bookmarks added successfully")
  } catch (error) {
    // If pdf-lib post-processing fails, save the Playwright-generated PDF as-is
    console.warn(
      "[pdf]   ⚠ Failed to add bookmarks, saving without outlines:",
      error
    )
    fs.copyFileSync(tempPdfPath, output)
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath)
    } catch {
      // Ignore cleanup errors
    }
  }

  // Report final file size
  const stats = fs.statSync(output)
  const sizeMb = (stats.size / 1024 / 1024).toFixed(1)
  console.log(`[pdf] ✓ Done! PDF saved to: ${output} (${sizeMb} MB)`)
}

// ── Execute ─────────────────────────────────────────────────────────────────

async function main() {
  const { locale, output } = parseArgs()

  try {
    if (locale === "all") {
      await Promise.all([
        runPdf("en", path.join(process.cwd(), "public", "gtmc-en.pdf")),
        runPdf("zh", path.join(process.cwd(), "public", "gtmc-zh.pdf")),
      ])
    } else {
      await runPdf(locale as "en" | "zh", output)
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

main()
