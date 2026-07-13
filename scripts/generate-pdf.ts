#!/usr/bin/env npx tsx

/**
 * PDF Generation Script — archival print edition of the GTMC book.
 *
 * Pipeline per locale:
 *   1. Load + sort the article tree, linearize, and number it (book plan)
 *   2. Scan article bodies once (code languages, math, content map)
 *   3. Render the cover as its own single-page PDF (no running apparatus)
 *   4. Render the body to bounded convergence: pass 1 measures real page
 *      numbers, pass 2 inserts TOC folios, and one final pass runs only when
 *      those folios changed their own target pages
 *   5. Merge cover + body, write exact-page outlines and metadata
 *
 * Usage:
 *   npx tsx scripts/generate-pdf.ts --locale en --output public/gtmc-en.pdf
 *   npx tsx scripts/generate-pdf.ts               # defaults: all locales
 */

import { chromium } from "playwright"
import type { Browser, Page } from "playwright"
import { PDFDocument } from "pdf-lib"
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { execSync } from "node:child_process"

import { getArticleTree } from "@/lib/articles/manifest"
import { preparePublicChapterNav } from "@/lib/articles/public-tree"
import {
  linearizeArticles,
  getArticleContentForPdf,
} from "@/lib/articles/linearize"
import type { LinearizedArticle } from "@/lib/articles/linearize"
import {
  buildBodyHtml,
  buildBookPlan,
  buildCoverHtml,
  getLabels,
} from "@/lib/pdf/document"
import type { BookOptions, PdfLocale } from "@/lib/pdf/document"
import { resolveImagesInHtml } from "@/lib/pdf/images"
import { renderMarkdownToHtml } from "@/lib/pdf/markdown-pipeline"
import { buildOutlineTree, writePdfOutlines } from "@/lib/pdf/outline"
import {
  fillTocFolios,
  haveTocFolioPagesChanged,
  readAnchorPageIndices,
} from "@/lib/pdf/paginate"
import { paintPageBackgrounds } from "@/lib/pdf/paint-background"
import {
  PDF_REQUIRED_FONTS,
  buildFooterTemplate,
  buildHeaderTemplate,
} from "@/lib/pdf/theme"
import { createRehypeShiki } from "@/lib/markdown/syntax/rehype-shiki"
import type { RehypeShikiPlugin } from "@/lib/markdown/syntax/rehype-shiki"

const BOOK_TITLE = "Graduate Texts in Minecraft"
const BOOK_SUBTITLE = "An Introduction to Technical Minecraft"
const SOURCE_URL = "https://techmc.wiki"
const TAGLINES: Record<PdfLocale, string> = {
  en: "Knowledge exists. Structure matters.",
  zh: "知识从未缺失，缺失的是连接。",
}

function getArticlesRevision(): string | undefined {
  try {
    const articlesDir = path.join(process.cwd(), "articles")
    return execSync("git rev-parse --short=7 HEAD", {
      cwd: articlesDir,
      encoding: "utf-8",
    }).trim()
  } catch {
    return undefined
  }
}

interface CliOptions {
  locale: PdfLocale | "all"
  output: string
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  let locale: PdfLocale | "all" = "all"
  let output = ""

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--locale" && i + 1 < args.length) {
      const val = args[i + 1].toLowerCase()
      if (val === "en" || val === "zh" || val === "all") locale = val
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

async function analyzeArticles(
  articles: LinearizedArticle[],
  locale: PdfLocale
): Promise<{
  codeLangs: string[]
  hasMath: boolean
  bodies: Map<string, string>
}> {
  const allLangs = new Set<string>()
  let hasMath = false
  const bodies = new Map<string, string>()

  await Promise.all(
    articles.map(async (article) => {
      const body = await getArticleContentForPdf(article.slug, locale).catch(
        () => null
      )
      if (!body) return

      for (const m of body.matchAll(/^```(\w+)/gm)) {
        const lang = m[1].toLowerCase()
        if (lang !== "" && lang !== "text" && lang !== "plain") {
          allLangs.add(lang)
        }
      }
      if (body.includes("$") || body.includes("\\(") || body.includes("\\[")) {
        hasMath = true
      }
      bodies.set(article.slug, body)
    })
  )

  return { codeLangs: [...allLangs], hasMath, bodies }
}

function createRenderArticle(
  shikiPlugin: RehypeShikiPlugin | undefined,
  locale: PdfLocale,
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
        locale,
      })

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

interface RenderPdfOptions {
  displayHeaderFooter: boolean
  headerTemplate?: string
  footerTemplate?: string
}

async function renderHtmlToPdf(
  browser: Browser,
  html: string,
  tempHtmlPath: string,
  tempPdfPath: string,
  options: RenderPdfOptions
): Promise<Uint8Array> {
  fs.writeFileSync(tempHtmlPath, html, "utf-8")

  const context = await browser.newContext({ colorScheme: "light" })
  try {
    const page: Page = await context.newPage()
    await page.goto(pathToFileURL(tempHtmlPath).href, { waitUntil: "load" })

    const requiredFonts = [...PDF_REQUIRED_FONTS]
    await page.waitForFunction(
      (fonts) =>
        document.fonts.ready.then(() =>
          fonts.every((f) => document.fonts.check(f))
        ),
      requiredFonts,
      { timeout: 30000 }
    )

    await page.pdf({
      path: tempPdfPath,
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      displayHeaderFooter: options.displayHeaderFooter,
      headerTemplate: options.headerTemplate ?? "<span></span>",
      footerTemplate: options.footerTemplate ?? "<span></span>",
    })

    return fs.readFileSync(tempPdfPath)
  } finally {
    await context.close()
  }
}

async function runPdf(locale: PdfLocale, output: string): Promise<void> {
  console.log(`[pdf] Generating PDF (locale=${locale}, output=${output})`)

  const outDir = path.dirname(output)
  fs.mkdirSync(outDir, { recursive: true })

  console.log("[pdf] Phase 1/6: Loading and numbering article tree...")
  const tree = preparePublicChapterNav(await getArticleTree(locale))
  if (!tree || tree.length === 0) {
    console.warn(
      "[pdf] No articles found in tree (submodule may not be initialized). Skipping PDF generation."
    )
    return
  }
  const linearized = await linearizeArticles(tree)

  console.log("[pdf] Phase 2/6: Scanning article content...")
  const { codeLangs, hasMath, bodies } = await analyzeArticles(
    linearized,
    locale
  )

  // Empty drafts and unloadable artifacts get no number, no TOC row, and
  // no section — they only exist as placeholders in the article tree.
  const articles = linearized.filter((article) =>
    bodies.get(article.slug)?.trim()
  )
  const plan = buildBookPlan(articles)
  console.log(
    `[pdf]   → ${articles.length}/${linearized.length} article(s) with content, ${plan.chapters.length} chapter(s)`
  )
  console.log(
    `[pdf]   → Code languages: ${codeLangs.join(", ") || "none"} · math: ${hasMath}`
  )

  console.log("[pdf] Phase 3/6: Initializing syntax highlighter...")
  let shikiPlugin: RehypeShikiPlugin | undefined
  if (codeLangs.length > 0) {
    shikiPlugin = await createRehypeShiki(codeLangs).catch((error) => {
      console.warn(
        "[pdf]   ⚠ Failed to initialize Shiki, continuing without highlighting:",
        error
      )
      return undefined
    })
  }

  console.log("[pdf] Phase 4/6: Building book HTML...")
  const bookOptions: BookOptions = {
    title: BOOK_TITLE,
    subtitle: BOOK_SUBTITLE,
    tagline: TAGLINES[locale],
    locale,
    generatedDate: new Date().toISOString().split("T")[0],
    articlesRevision: getArticlesRevision(),
    sourceUrl: SOURCE_URL,
    hasMath,
    renderArticle: createRenderArticle(shikiPlugin, locale, bodies),
  }

  const coverHtml = buildCoverHtml(bookOptions)
  const { html: bodyHtml, plan: effectivePlan } = await buildBodyHtml(
    bookOptions,
    plan
  )
  console.log(
    `[pdf]   → HTML built (${(bodyHtml.length / 1024 / 1024).toFixed(1)} MB)`
  )

  const tempHtmlPath = path.join(outDir, `.gtmc-pdf-temp-${locale}.html`)
  const tempPdfPath = output + ".tmp"
  const cleanupTemp = () => {
    for (const p of [tempHtmlPath, tempPdfPath]) {
      try {
        fs.rmSync(p, { force: true })
      } catch {
        /* ignore */
      }
    }
  }

  console.log("[pdf] Phase 5/6: Rendering PDF (cover + convergent body)...")
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

  let coverBytes: Uint8Array
  let bodyBytes: Uint8Array
  let anchorPages: Map<string, number>
  try {
    coverBytes = await renderHtmlToPdf(
      browser,
      coverHtml,
      tempHtmlPath,
      tempPdfPath,
      { displayHeaderFooter: false }
    )

    const bodyRenderOptions: RenderPdfOptions = {
      displayHeaderFooter: true,
      headerTemplate: buildHeaderTemplate(BOOK_TITLE),
      footerTemplate: buildFooterTemplate(),
    }

    const pass1Bytes = await renderHtmlToPdf(
      browser,
      bodyHtml,
      tempHtmlPath,
      tempPdfPath,
      bodyRenderOptions
    )

    const pass1AnchorPages = await readAnchorPageIndices(pass1Bytes)
    const { html: filledHtml, missing } = fillTocFolios(
      bodyHtml,
      pass1AnchorPages
    )
    if (missing.length > 0) {
      console.warn(
        `[pdf]   ⚠ ${missing.length} TOC anchor(s) without a measured page: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ", …" : ""}`
      )
    }
    console.log(
      `[pdf]   → Pass 1 measured ${pass1AnchorPages.size} anchors; re-rendering with folios...`
    )

    bodyBytes = await renderHtmlToPdf(
      browser,
      filledHtml,
      tempHtmlPath,
      tempPdfPath,
      bodyRenderOptions
    )

    const pass2AnchorPages = await readAnchorPageIndices(bodyBytes)
    if (
      haveTocFolioPagesChanged(bodyHtml, pass1AnchorPages, pass2AnchorPages)
    ) {
      console.log(
        "[pdf]   → Pass 2 shifted TOC targets; rendering one final folio pass..."
      )
      const { html: finalHtml } = fillTocFolios(bodyHtml, pass2AnchorPages)
      bodyBytes = await renderHtmlToPdf(
        browser,
        finalHtml,
        tempHtmlPath,
        tempPdfPath,
        bodyRenderOptions
      )
      anchorPages = await readAnchorPageIndices(bodyBytes)
      if (haveTocFolioPagesChanged(bodyHtml, pass2AnchorPages, anchorPages)) {
        throw new Error(
          "[pdf] TOC folios did not converge after the final pass"
        )
      }
    } else {
      anchorPages = pass2AnchorPages
    }
  } catch (error) {
    cleanupTemp()
    throw new Error(`[pdf] PDF generation failed: ${error}`, { cause: error })
  } finally {
    await browser.close()
  }
  cleanupTemp()

  console.log("[pdf] Phase 6/6: Merging cover, outlines, and metadata...")
  const coverDoc = await PDFDocument.load(coverBytes)
  const coverPageCount = coverDoc.getPageCount()

  // The body document stays the base so its catalog — including the
  // /Dests dictionary that internal TOC links resolve through — survives
  // the merge; building a fresh document via copyPages would drop it.
  const merged = await PDFDocument.load(bodyBytes)
  const coverPages = await merged.copyPages(coverDoc, coverDoc.getPageIndices())
  coverPages.forEach((p, i) => merged.insertPage(i, p))

  // Paint a full-page paper-colored rect behind all content on every page.
  // CSS background can't reach the @page margin area; this pdf-lib step
  // fills the entire media box so no white margins are visible.
  paintPageBackgrounds(merged, "f5f4ef")

  const outlineTree = buildOutlineTree(
    effectivePlan,
    anchorPages,
    locale,
    coverPageCount,
    getLabels(locale).tocTitle
  )
  writePdfOutlines(merged, outlineTree)

  merged.setTitle(`${BOOK_TITLE} — ${BOOK_SUBTITLE}`)
  merged.setAuthor("The GTMC community")
  merged.setSubject(TAGLINES[locale])
  merged.setLanguage(locale === "zh" ? "zh-CN" : "en")
  merged.setProducer("GTMC PDF pipeline (Playwright + pdf-lib)")

  fs.writeFileSync(output, await merged.save())

  const sizeMb = (fs.statSync(output).size / 1024 / 1024).toFixed(1)
  console.log(
    `[pdf] ✓ Done! ${merged.getPageCount()} pages saved to: ${output} (${sizeMb} MB)`
  )
}

async function main() {
  const { locale, output } = parseArgs()

  try {
    if (locale === "all") {
      await Promise.all([
        runPdf("en", path.join(process.cwd(), "public", "gtmc-en.pdf")),
        runPdf("zh", path.join(process.cwd(), "public", "gtmc-zh.pdf")),
      ])
    } else {
      await runPdf(locale, output)
    }
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

main()
