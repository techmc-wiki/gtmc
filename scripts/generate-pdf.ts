#!/usr/bin/env npx tsx

/**
 * PDF generation script — archival print edition of the GTMC book.
 *
 * TypeScript owns book planning and HTML assembly. The pdfgen binary owns
 * Chromium rendering and PDF post-processing. Each locale converges TOC folios
 * in at most three body renders before pdfgen merges the cover and writes the
 * measured outline tree.
 */

import { execFileSync, execSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import enMessages from "@/messages/en.json"
import zhMessages from "@/messages/zh.json"
import { getArticleTree } from "@/lib/articles/manifest"
import { preparePublicChapterNav } from "@/lib/articles/public-tree"
import {
  getArticleContentForPdf,
  linearizeArticles,
} from "@/lib/articles/linearize"
import type { LinearizedArticle } from "@/lib/articles/linearize"
import { artifactFilename } from "@/lib/articles/content"
import {
  buildBodyHtml,
  buildBookPlan,
  buildCoverHtml,
  formatChapterLabel,
  getLabels,
} from "@/lib/pdf/document"
import type {
  BookOptions,
  BookPlan,
  ChapterContent,
  PdfLocale,
} from "@/lib/pdf/document"
import { resolveImagesInHtml } from "@/lib/pdf-images"
import { fillTocFolios, haveTocFolioPagesChanged } from "@/lib/pdf/paginate"
import { PDF_COLORS, PDF_REQUIRED_FONTS } from "@/lib/pdf/theme"
import { createLogger } from "./lib/logger"

const logger = createLogger("pdf")
const SOURCE_URL = "https://techmc.wiki"
const PDFGEN_ENV = "PDFGEN_BIN"

const PDF_MESSAGES = {
  en: enMessages.Pdf,
  zh: zhMessages.Pdf,
} satisfies Record<
  PdfLocale,
  {
    bookTitle: string
    bookSubtitle: string
    slogan: string
  }
>

interface CliOptions {
  locale: PdfLocale | "all"
  output: string
}

interface PdfgenReport {
  pages: number
  dests: Record<string, number>
}

interface OutlineNode {
  title: string
  page: number
  children: OutlineNode[]
}

let resolvedPdfgen: string | undefined
let pdfgenBuildDir: string | undefined

function getArticlesRevision(): string | undefined {
  try {
    return execSync("git rev-parse --short=7 HEAD", {
      cwd: path.join(process.cwd(), "articles"),
      encoding: "utf-8",
    }).trim()
  } catch {
    return undefined
  }
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  let locale: PdfLocale | "all" = "all"
  let output = ""

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--locale" && i + 1 < args.length) {
      const value = args[i + 1].toLowerCase()
      if (value === "en" || value === "zh" || value === "all") locale = value
      i++
    } else if (arg === "--output" && i + 1 < args.length) {
      output = path.resolve(process.cwd(), args[i + 1])
      i++
    }
  }

  return { locale, output }
}

function findOnPath(command: string): string | undefined {
  const result = spawnSync("which", [command], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  })
  if (result.status !== 0) return undefined
  const resolved = result.stdout.trim()
  return resolved || undefined
}

function resolvePdfgen(): string {
  if (resolvedPdfgen) return resolvedPdfgen

  const configured = process.env[PDFGEN_ENV]
  if (configured) {
    resolvedPdfgen = configured
    return configured
  }

  const onPath = findOnPath("pdfgen")
  if (onPath) {
    resolvedPdfgen = onPath
    return onPath
  }

  pdfgenBuildDir = fs.mkdtempSync(path.join(os.tmpdir(), "gtmc-pdfgen-"))
  const builtPath = path.join(pdfgenBuildDir, "pdfgen")
  logger.event("pdfgen.build.started", { output: builtPath })
  const goProject = fs.existsSync(path.join(process.cwd(), "pdfgen", "go.mod"))
  try {
    const args = goProject
      ? ["build", "-C", "pdfgen", "-o", builtPath, "."]
      : ["build", "-o", builtPath, "./pdfgen"]
    execFileSync("go", args, {
      cwd: process.cwd(),
      stdio: "inherit",
    })
  } catch (error) {
    throw new Error(
      `Unable to find pdfgen in PATH or build the pdfgen Go module: ${String(error)}`,
      { cause: error }
    )
  }
  resolvedPdfgen = builtPath
  logger.event("pdfgen.build.completed", { output: builtPath })
  return builtPath
}

function commonPdfgenArgs(): string[] {
  const args = ["--fonts", PDF_REQUIRED_FONTS.join(",")]
  const mermaidPath = path.join(
    process.cwd(),
    "node_modules",
    "mermaid",
    "dist",
    "mermaid.min.js"
  )
  if (fs.existsSync(mermaidPath)) args.push("--mermaid-js", mermaidPath)

  const chromiumPath =
    process.env.PDFGEN_CHROMIUM ??
    process.env.CHROMIUM_PATH ??
    process.env.CHROMIUM
  if (chromiumPath) args.push("--chromium", chromiumPath)

  return args
}

function runPdfgen(args: string[], report = false): PdfgenReport | undefined {
  const binary = resolvePdfgen()
  const result = spawnSync(binary, args, {
    cwd: process.cwd(),
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (result.error) {
    throw new Error(`pdfgen failed to start: ${result.error.message}`)
  }
  if (result.status !== 0) {
    const detail = [result.stderr.trim(), result.stdout.trim()]
      .filter(Boolean)
      .join("\n")
    throw new Error(`pdfgen ${args[0] ?? "command"} failed: ${detail}`)
  }
  if (!report) return undefined

  const lines = result.stdout
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const lastLine = lines.at(-1)
  if (!lastLine) throw new Error("pdfgen render did not report page data")

  let parsed: unknown
  try {
    parsed = JSON.parse(lastLine)
  } catch (error) {
    throw new Error(
      `pdfgen render returned invalid report JSON: ${String(error)}`,
      { cause: error }
    )
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    !("pages" in parsed) ||
    !("dests" in parsed)
  ) {
    throw new Error("pdfgen render report is not an object")
  }
  const pages = parsed.pages
  const rawDests = parsed.dests
  if (
    typeof pages !== "number" ||
    !Number.isInteger(pages) ||
    pages < 0 ||
    !rawDests ||
    typeof rawDests !== "object" ||
    Array.isArray(rawDests)
  ) {
    throw new Error("pdfgen render report has an invalid pages/dests shape")
  }

  const dests: Record<string, number> = {}
  for (const [anchor, page] of Object.entries(rawDests)) {
    if (typeof page !== "number" || !Number.isInteger(page) || page < 0) {
      throw new Error(`pdfgen render reported an invalid page for ${anchor}`)
    }
    dests[anchor] = page
  }

  return { pages, dests }
}

function pdfgenPages(pdfPath: string): number {
  const binary = resolvePdfgen()
  const pageResult = spawnSync(binary, ["pages", pdfPath], {
    cwd: process.cwd(),
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (pageResult.error || pageResult.status !== 0) {
    throw new Error(
      `pdfgen pages failed: ${pageResult.stderr?.trim() || pageResult.error?.message || "unknown error"}`
    )
  }
  const lines = pageResult.stdout
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const lastLine = lines.at(-1)
  if (!lastLine) throw new Error("pdfgen pages returned no JSON")
  let parsed: unknown
  try {
    parsed = JSON.parse(lastLine)
  } catch (error) {
    throw new Error(`pdfgen pages returned invalid JSON: ${String(error)}`, {
      cause: error,
    })
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    !("pages" in parsed) ||
    typeof parsed.pages !== "number" ||
    !Number.isInteger(parsed.pages) ||
    parsed.pages < 0
  ) {
    throw new Error("pdfgen pages returned an invalid response")
  }
  return parsed.pages
}

async function analyzeArticles(
  articles: LinearizedArticle[],
  locale: PdfLocale
): Promise<{
  codeLangs: string[]
  hasMath: boolean
}> {
  const allLangs = new Set<string>()
  let hasMath = false

  await Promise.all(
    articles.map(async (article) => {
      const body = await getArticleContentForPdf(article.slug, locale).catch(
        () => null
      )
      if (!body) return

      for (const match of body.matchAll(/^```(\w+)/gm)) {
        const lang = match[1].toLowerCase()
        if (
          lang !== "" &&
          lang !== "text" &&
          lang !== "plain" &&
          lang !== "mermaid"
        ) {
          allLangs.add(lang)
        }
      }
      if (body.includes("$") || body.includes("\\(") || body.includes("\\[")) {
        hasMath = true
      }
    })
  )

  return { codeLangs: [...allLangs], hasMath }
}

function loadPdfHtmlSidecar(slug: string, locale: PdfLocale): string {
  const sidecarPath = path.join(
    process.cwd(),
    "data",
    "pdf-html",
    locale,
    `${artifactFilename(slug)}.html`
  )
  try {
    return fs.readFileSync(sidecarPath, "utf-8")
  } catch {
    throw new Error(
      `Missing PDF HTML sidecar: ${sidecarPath}. Run pnpm build:content or pnpm generate:content first.`
    )
  }
}

function createRenderArticle(
  locale: PdfLocale,
  sourceCounters: { cached: number }
): BookOptions["renderArticle"] {
  return async (article: LinearizedArticle): Promise<string> => {
    const html = loadPdfHtmlSidecar(article.slug, locale)
    sourceCounters.cached++
    return resolveImagesInHtml(html, article.filePath)
  }
}

function buildOutlineTree(
  plan: BookPlan,
  anchorPages: Map<string, number>,
  locale: PdfLocale
): OutlineNode[] {
  const root: OutlineNode[] = [
    { title: getLabels(locale).tocTitle, page: 0, children: [] },
  ]
  const pageOf = (anchor: string): number | undefined => anchorPages.get(anchor)

  for (const entry of plan.preface) {
    const page = pageOf(`article-${entry.article.slug}`)
    if (page === undefined) continue
    root.push({ title: entry.article.title, page, children: [] })
  }

  function outlineContent(content: ChapterContent[]): OutlineNode[] {
    const children: OutlineNode[] = []
    for (const item of content) {
      if (item.kind === "article") {
        const page = pageOf(`article-${item.entry.article.slug}`)
        if (page !== undefined) {
          const prefix = item.entry.number ? `${item.entry.number}  ` : ""
          children.push({
            title: `${prefix}${item.entry.article.title}`,
            page,
            children: [],
          })
        }
        continue
      }

      const nested = outlineContent(item.content)
      const firstDescendant = nested[0]
      if (firstDescendant) {
        children.push({
          title: item.title,
          page: firstDescendant.page,
          children: nested,
        })
      }
    }
    return children
  }

  for (const chapter of plan.chapters) {
    const page = pageOf(`chapter-${chapter.slug}`)
    if (page === undefined) continue
    root.push({
      title: `${formatChapterLabel(locale, chapter.number, chapter.isAppendix)} — ${chapter.title}`,
      page,
      children: outlineContent(chapter.content),
    })
  }

  return root
}

function writeBodyHtml(workDir: string, html: string, pass: string): string {
  const filePath = path.join(workDir, `body-${pass}.html`)
  fs.writeFileSync(filePath, html, "utf-8")
  return filePath
}

async function runPdf(
  locale: PdfLocale,
  requestedOutput: string
): Promise<void> {
  const startedAt = performance.now()
  const output =
    requestedOutput ||
    path.join(process.cwd(), "data", "pdf-dist", `gtmc-${locale}.pdf`)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  logger.event("pdf.started", { locale, output })

  const tree = preparePublicChapterNav(await getArticleTree(locale))
  if (!tree || tree.length === 0) {
    logger.warn("pdf.skipped", { locale, reason: "empty-article-tree" })
    return
  }

  const linearized = await linearizeArticles(tree)
  const { codeLangs, hasMath } = await analyzeArticles(linearized, locale)
  const plan = buildBookPlan(
    linearized.filter((article) =>
      loadPdfHtmlSidecar(article.slug, locale).trim()
    )
  )
  logger.event("pdf.content.analyzed", {
    article_count: linearized.length,
    chapter_count: plan.chapters.length,
    code_language_count: codeLangs.length,
    has_math: hasMath,
    locale,
    tree_entry_count: linearized.length,
  })

  const messages = PDF_MESSAGES[locale]
  const sourceCounters = { cached: 0 }
  const bookOptions = {
    title: messages.bookTitle,
    subtitle: messages.bookSubtitle,
    tagline: messages.slogan,
    locale,
    generatedDate: new Date().toISOString().split("T")[0],
    articlesRevision: getArticlesRevision(),
    sourceUrl: SOURCE_URL,
    hasMath,
    renderArticle: createRenderArticle(locale, sourceCounters),
  }

  const coverHtml = buildCoverHtml(bookOptions)
  const { html: bodyHtml, plan: effectivePlan } = await buildBodyHtml(
    bookOptions,
    plan
  )
  logger.event("pdf.html.source", {
    locale,
    cached: sourceCounters.cached,
  })
  logger.event("pdf.html.generated", {
    locale,
    size_mb: (bodyHtml.length / 1024 / 1024).toFixed(1),
  })

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `gtmc-pdf-${locale}-`))
  const coverHtmlPath = path.join(workDir, "cover.html")
  const bodyHtmlPath = path.join(workDir, "body.html")
  const coverPdfPath = path.join(workDir, "cover.pdf")
  const bodyPdfPath = path.join(workDir, "body.pdf")
  const outlinesPath = path.join(workDir, "outlines.json")
  fs.writeFileSync(coverHtmlPath, coverHtml, "utf-8")
  fs.writeFileSync(bodyHtmlPath, bodyHtml, "utf-8")

  try {
    runPdfgen([
      "render",
      "--html",
      coverHtmlPath,
      "--out",
      coverPdfPath,
      ...commonPdfgenArgs(),
    ])

    const renderBody = (html: string, pass: string): PdfgenReport => {
      const htmlPath =
        pass === "empty" ? bodyHtmlPath : writeBodyHtml(workDir, html, pass)
      const report = runPdfgen(
        [
          "render",
          "--html",
          htmlPath,
          "--out",
          bodyPdfPath,
          "--report-pages",
          "--report-dests",
          "--header-footer",
          ...commonPdfgenArgs(),
        ],
        true
      )
      if (!report) throw new Error("pdfgen did not return a body report")
      return report
    }

    const pass1 = renderBody(bodyHtml, "empty")
    const pass1Pages = new Map(Object.entries(pass1.dests))
    const filledPass1 = fillTocFolios(bodyHtml, pass1Pages)
    if (filledPass1.missing.length > 0) {
      logger.warn(
        "pdf.toc.anchors-missing",
        { count: filledPass1.missing.length, locale },
        filledPass1.missing.slice(0, 3).join(", ")
      )
    }
    let finalReport = renderBody(filledPass1.html, "filled-1")
    const pass2Pages = new Map(Object.entries(finalReport.dests))
    if (haveTocFolioPagesChanged(bodyHtml, pass1Pages, pass2Pages)) {
      const filledPass2 = fillTocFolios(bodyHtml, pass2Pages)
      finalReport = renderBody(filledPass2.html, "filled-2")
      const pass3Pages = new Map(Object.entries(finalReport.dests))
      if (haveTocFolioPagesChanged(bodyHtml, pass2Pages, pass3Pages)) {
        throw new Error(
          "[pdf] TOC folios did not converge after the final pass"
        )
      }
    }

    const finalAnchorPages = new Map(Object.entries(finalReport.dests))
    fs.writeFileSync(
      outlinesPath,
      `${JSON.stringify(buildOutlineTree(effectivePlan, finalAnchorPages, locale))}\n`,
      "utf-8"
    )

    runPdfgen([
      "postprocess",
      "--cover",
      coverPdfPath,
      "--body",
      bodyPdfPath,
      "--out",
      output,
      "--outlines",
      outlinesPath,
      "--background",
      PDF_COLORS.paper,
      "--title",
      `${messages.bookTitle} — ${messages.bookSubtitle}`,
      "--subject",
      messages.slogan,
      "--author",
      "The GTMC community",
    ])

    const coverPages = pdfgenPages(coverPdfPath)
    const finalPages = pdfgenPages(output)
    logger.event("pdf.generated", {
      body_pages: finalReport.pages,
      cover_pages: coverPages,
      duration_ms: Math.round(performance.now() - startedAt),
      locale,
      output,
      page_count: finalPages,
      size_mb: (fs.statSync(output).size / 1024 / 1024).toFixed(1),
    })
  } catch (error) {
    throw new Error(`[pdf] PDF generation failed: ${String(error)}`, {
      cause: error,
    })
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
  }
}

async function main(): Promise<void> {
  const { locale, output } = parseArgs()
  try {
    if (locale === "all") {
      await Promise.all([runPdf("en", ""), runPdf("zh", "")])
    } else {
      await runPdf(locale, output)
    }
  } catch (error) {
    logger.error(
      "pdf.failed",
      {},
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    )
    process.exitCode = 1
  } finally {
    if (pdfgenBuildDir) {
      fs.rmSync(pdfgenBuildDir, { recursive: true, force: true })
    }
  }
}

void main()
