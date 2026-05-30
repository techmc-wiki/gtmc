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
import type { PDFDict } from "pdf-lib"
import { PDFDocument, PDFName } from "pdf-lib"
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
import { renderMarkdownToHtml } from "@/lib/pdf/markdown-pipeline"
import { createRehypeShiki } from "@/lib/markdown/plugins/rehype-shiki"
import type { RehypeShikiPlugin } from "@/lib/markdown/plugins/rehype-shiki"

// ── Types ───────────────────────────────────────────────────────────────────

interface CliOptions {
  locale: "en" | "zh"
  output: string
}

interface TreeNode {
  children: TreeNode[]
}

function countTreeItems(items: TreeNode[]): number {
  let c = items.length
  for (const item of items) c += countTreeItems(item.children)
  return c
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
    if (node.children?.length) sortChapterTree(node.children)
  }
}

interface OutlineNode {
  title: string
  pageIndex: number
  children: OutlineNode[]
}

// ── CLI Parsing ─────────────────────────────────────────────────────────────

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  let locale: "en" | "zh" = "en"
  let output = path.join(process.cwd(), "public", "gtmc.pdf")

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--locale" && i + 1 < args.length) {
      const val = args[i + 1].toLowerCase()
      if (val === "en" || val === "zh") locale = val
      i++
    } else if (arg === "--output" && i + 1 < args.length) {
      output = path.resolve(process.cwd(), args[i + 1])
      i++
    }
  }

  return { locale, output }
}

// ── Content Scanning ────────────────────────────────────────────────────────

/**
 * Scan all articles for fenced code blocks and collect distinct languages.
 */
async function collectCodeLangs(
  articles: LinearizedArticle[],
  locale: ArticleLocale
): Promise<string[]> {
  const allLangs = new Set<string>()

  const results = await Promise.all(
    articles.map(async (article) => {
      try {
        const content = await getArticleContentForPdf(article.slug, locale)
        if (!content) return []
        const langs: string[] = []
        const matches = content.matchAll(/^```(\w+)/gm)
        for (const m of matches) {
          const lang = m[1].toLowerCase()
          if (lang !== "" && lang !== "text" && lang !== "plain") {
            langs.push(lang)
          }
        }
        return langs
      } catch {
        // Skip articles that fail to load during scanning
        return []
      }
    })
  )
  for (const langs of results) {
    for (const lang of langs) allLangs.add(lang)
  }

  return [...allLangs]
}

/**
 * Check whether any article contains math expressions that require KaTeX.
 */
async function checkHasMath(
  articles: LinearizedArticle[],
  locale: ArticleLocale
): Promise<boolean> {
  /* oxlint-disable eslint/no-await-in-loop -- early-return on first match requires sequential iteration */
  for (const article of articles) {
    try {
      const content = await getArticleContentForPdf(article.slug, locale)
      if (!content) continue
      if (
        content.includes("$") ||
        content.includes("\\(") ||
        content.includes("\\[")
      ) {
        return true
      }
    } catch {
      // Skip articles that fail to load
    }
  }
  /* oxlint-enable eslint/no-await-in-loop */
  return false
}

// ── Custom Article Renderer ─────────────────────────────────────────────────

/**
 * Factory that returns a renderArticle callback for `buildEbookHtml()`.
 * Each article's markdown is rendered through the PDF pipeline with optional
 * Shiki syntax highlighting.
 */
function createRenderArticle(
  shikiPlugin: RehypeShikiPlugin | undefined,
  locale: ArticleLocale
) {
  return async (article: LinearizedArticle): Promise<string> => {
    try {
      const content = await getArticleContentForPdf(article.slug, locale)
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

// ── Outline Tree Builder ────────────────────────────────────────────────────

/**
 * Build a hierarchical outline tree from the linearized articles.
 *
 * Page indices are sequential estimates (cover=0, toc=1, then each section
 * gets the next integer). Actual page numbers depend on content length, so
 * these are best-effort approximations.
 */
function buildOutlineTree(articles: LinearizedArticle[]): OutlineNode[] {
  const root: OutlineNode[] = []

  // Cover → page 0, TOC → page 1, content starts at page 2
  let nextPage = 2

  // ── Preface articles (no chapter grouping) ──────────────────────────────
  for (const article of articles) {
    if (!article.isPreface) continue
    root.push({
      title: article.title,
      pageIndex: nextPage++,
      children: [],
    })
  }

  // ── Group remaining articles by chapter ─────────────────────────────────
  const chapters = new Map<
    string,
    { title: string; articles: LinearizedArticle[] }
  >()
  for (const article of articles) {
    if (article.isPreface || !article.chapterSlug) continue

    let chapter = chapters.get(article.chapterSlug)
    if (!chapter) {
      chapter = { title: article.chapterTitle, articles: [] }
      chapters.set(article.chapterSlug, chapter)
    }
    chapter.articles.push(article)
  }

  for (const [, chapter] of chapters) {
    const entry: OutlineNode = {
      title: chapter.title,
      pageIndex: nextPage++,
      children: [],
    }

    for (const article of chapter.articles) {
      entry.children.push({
        title: article.title,
        pageIndex: nextPage++,
        children: [],
      })
    }

    root.push(entry)
  }

  return root
}

// ── PDF Outline Writer (pdf-lib) ───────────────────────────────────────────

/**
 * Write PDF outline items (bookmarks) into the document using low-level
 * pdf-lib API calls.
 *
 * Structure:
 *   Catalog → /Outlines (root dict)
 *   Root dict → /First → top-level item, /Last → top-level item
 *   Each item: { /Title, /Parent, /Dest, /First, /Last (if children), /Next, /Prev }
 *
 * @param pdfDoc   The loaded PDFDocument (from pdf-lib)
 * @param tree     Hierarchical outline tree with titles and estimated page indices
 */
async function writePdfOutlines(
  pdfDoc: PDFDocument,
  tree: OutlineNode[]
): Promise<void> {
  const context = pdfDoc.context
  const pages = pdfDoc.getPages()
  if (pages.length === 0 || tree.length === 0) return

  // Helper: clamp page index into valid range
  const clampPage = (idx: number): number =>
    Math.max(0, Math.min(idx, pages.length - 1))

  // Helper: build a destination array [pageRef /Fit]
  const makeDest = (pageIdx: number): ReturnType<typeof context.obj> =>
    context.obj([pages[clampPage(pageIdx)].ref, PDFName.of("Fit")])

  // ── Phase 1: Build refs, create all dicts ───────────────────────────────
  // We structure the data so we can link siblings after creation.

  interface ItemData {
    ref: ReturnType<typeof context.nextRef>
    dict: PDFDict
    children: ItemData[]
  }

  function buildItem(
    node: OutlineNode,
    parentRef: ReturnType<typeof context.nextRef>
  ): ItemData {
    const ref = context.nextRef()
    const dest = makeDest(node.pageIndex)
    const dict = context.obj({
      Title: node.title,
      Parent: parentRef,
      Dest: dest,
    })

    const item: ItemData = { ref, dict, children: [] }

    // Build children recursively
    for (const child of node.children) {
      item.children.push(buildItem(child, ref))
    }

    // Link children on parent dict
    if (item.children.length > 0) {
      dict.set(PDFName.of("First"), item.children[0].ref)
      dict.set(PDFName.of("Last"), item.children[item.children.length - 1].ref)
      // Count = number of children (positive = open)
      dict.set(PDFName.of("Count"), context.obj(item.children.length))
    }

    return item
  }

  const rootRef = context.nextRef()
  const topLevelItems: ItemData[] = tree.map((node) => buildItem(node, rootRef))

  // Link top-level siblings
  for (let i = 0; i < topLevelItems.length; i++) {
    const dict = topLevelItems[i].dict
    if (i > 0) dict.set(PDFName.of("Prev"), topLevelItems[i - 1].ref)
    if (i < topLevelItems.length - 1) {
      dict.set(PDFName.of("Next"), topLevelItems[i + 1].ref)
    }
  }

  // Link children within each parent
  for (const top of topLevelItems) {
    for (let i = 0; i < top.children.length; i++) {
      const dict = top.children[i].dict
      if (i > 0) dict.set(PDFName.of("Prev"), top.children[i - 1].ref)
      if (i < top.children.length - 1) {
        dict.set(PDFName.of("Next"), top.children[i + 1].ref)
      }
    }
  }

  // ── Phase 2: Assign refs to their dicts ───────────────────────────────
  function assignItem(item: ItemData): void {
    context.assign(item.ref, item.dict)
    for (const child of item.children) assignItem(child)
  }
  for (const item of topLevelItems) assignItem(item)

  // ── Phase 3: Create root Outlines dict ─────────────────────────────────
  // Total count = top-level items + all children
  const totalCount = countTreeItems(topLevelItems)

  const rootDict = context.obj({
    Type: PDFName.of("Outlines"),
    First: topLevelItems[0].ref,
    Last: topLevelItems[topLevelItems.length - 1].ref,
    Count: totalCount,
  })

  context.assign(rootRef, rootDict)

  // ── Phase 4: Link root into document catalog ──────────────────────────
  pdfDoc.catalog.set(PDFName.of("Outlines"), rootRef)
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { locale, output } = parseArgs()

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
    console.error("[pdf] Failed to load article tree:", error)
    process.exit(1)
  }

  if (!tree || tree.length === 0) {
    console.warn(
      "[pdf] No articles found in tree (submodule may not be initialized). Skipping PDF generation."
    )
    process.exit(0)
  }

  sortChapterTree(tree)

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 2: Linearize
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[pdf] Phase 2/6: Linearizing articles...")
  const articles = linearizeArticles(tree)
  console.log(`[pdf]   → ${articles.length} article(s) found`)

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 3: Scan content for code languages and math
  // ═══════════════════════════════════════════════════════════════════════
  console.log("[pdf] Phase 3/6: Scanning article content...")

  let codeLangs: string[]
  let hasMath: boolean
  try {
    ;[codeLangs, hasMath] = await Promise.all([
      collectCodeLangs(articles, locale),
      checkHasMath(articles, locale),
    ])
  } catch (error) {
    console.error("[pdf] Failed to scan articles:", error)
    process.exit(1)
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

  const renderArticle = createRenderArticle(shikiPlugin, locale)

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
    console.error("[pdf] Failed to build ebook HTML:", error)
    process.exit(1)
  }

  console.log(
    `[pdf]   → HTML built (${(html.length / 1024 / 1024).toFixed(1)} MB)`
  )

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 6: Generate PDF via Playwright and add bookmarks
  // ═══════════════════════════════════════════════════════════════════════
  const tempPdfPath = output + ".tmp"
  const tempHtmlPath = path.join(outDir, ".gtmc-pdf-temp.html")

  console.log("[pdf] Phase 6/6: Generating PDF via Playwright...")

  const browser = await chromium.launch().catch((error) => {
    console.warn(
      "[pdf] Failed to launch Playwright, skipping PDF generation:",
      error
    )
    process.exit(0)
  })

  try {
    // Write HTML to a temp file so file:// images and CSS @import resolve
    fs.writeFileSync(tempHtmlPath, html, "utf-8")

    const context = await browser.newContext({ colorScheme: "light" })
    const page = await context.newPage()

    // Navigate to the temp HTML file so file:// URL images load properly
    await page.goto(pathToFileURL(tempHtmlPath).href, {
      waitUntil: "networkidle",
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
    console.error("[pdf] PDF generation failed:", error)
    await browser.close()
    // Clean up temp HTML file on error
    try {
      if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath)
    } catch {
      /* ignore */
    }
    process.exit(1)
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
    await writePdfOutlines(pdfDoc, outlineTree)

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

main().catch((error) => {
  console.error("[pdf] Fatal error:", error)
  process.exit(1)
})
