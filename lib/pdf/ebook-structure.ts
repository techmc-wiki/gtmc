/**
 * Ebook structure HTML generator.
 *
 * Takes linearized article entries, renders each article's markdown to HTML
 * via the PDF pipeline, and assembles a complete ebook HTML document with
 * cover page, table of contents, per-chapter sections, and appendix —
 * ready for Playwright `page.setContent()` and `page.pdf()`.
 */

import fs from "node:fs"
import path from "node:path"

import type { LinearizedArticle } from "@/lib/articles/linearize"
import { getArticleContentForPdf } from "@/lib/articles/linearize"
import { renderMarkdownToHtml } from "@/lib/pdf/markdown-pipeline"
import { ARTICLES_PATH } from "@/lib/article-fs-constants"
import { resolveImageUrl } from "@/lib/pdf/image-resolver"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EbookOptions {
  /** Display title of the ebook */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Collection metadata (author, version, date) */
  meta?: Record<string, string>
  /** Linearized articles in display order */
  articles: LinearizedArticle[]
  /** Locale for UI chrome labels */
  locale?: "en" | "zh"
  /** Whether to include KaTeX CSS */
  hasMath?: boolean
  /** Callback to render each article's markdown content to HTML.
   *  If not provided, a default handler reads from disk and renders via
   *  renderMarkdownToHtml(). */
  renderArticle?: (article: LinearizedArticle) => Promise<string>
}

export interface EbookSection {
  type:
    | "cover"
    | "toc"
    | "preface"
    | "chapter-intro"
    | "chapter-article"
    | "appendix-intro"
    | "appendix-article"
  title: string
  htmlContent: string
  slug?: string
}

// ---------------------------------------------------------------------------
// Locale labels
// ---------------------------------------------------------------------------

const LOCALE_LABELS: Record<"en" | "zh", Record<string, string>> = {
  en: {
    tocTitle: "Table of Contents",
    chapter: "Chapter",
    appendix: "Appendix",
    preface: "Preface",
  },
  zh: {
    tocTitle: "目录",
    chapter: "章节",
    appendix: "附录",
    preface: "前言",
  },
}

// ---------------------------------------------------------------------------
// Print CSS loader
// ---------------------------------------------------------------------------

const CSS_PATH = path.join(process.cwd(), "lib", "pdf", "print.css")

let cachedCss: string | null = null

function loadPrintCss(): string {
  if (cachedCss !== null) return cachedCss
  cachedCss = fs.readFileSync(CSS_PATH, "utf-8")
  return cachedCss
}

// ---------------------------------------------------------------------------
// HTML fragment builders
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function renderCoverHtml(options: EbookOptions): string {
  const parts: string[] = ['<section class="cover-page">']

  parts.push(`  <h1>${escapeHtml(options.title)}</h1>`)

  if (options.subtitle) {
    parts.push(`  <p class="subtitle">${escapeHtml(options.subtitle)}</p>`)
  }

  if (options.meta && Object.keys(options.meta).length > 0) {
    parts.push('  <div class="meta">')
    for (const [key, value] of Object.entries(options.meta)) {
      parts.push(
        `    <p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</p>`
      )
    }
    parts.push("  </div>")
  }

  parts.push("</section>")
  return parts.join("\n")
}

function renderTocHtml(
  articles: LinearizedArticle[],
  labels: Record<string, string>
): string {
  const parts: string[] = ['<section class="toc-page">']
  parts.push(`  <h2>${labels.tocTitle}</h2>`)
  parts.push("  <ul>")

  let lastChapter = ""

  for (const article of articles) {
    if (article.isPreface) {
      parts.push(
        `    <li class="toc-h2"><a href="#article-${article.slug}">${escapeHtml(article.title)}</a></li>`
      )
      continue
    }

    if (article.chapterSlug && article.chapterSlug !== lastChapter) {
      lastChapter = article.chapterSlug
      parts.push(
        `    <li class="toc-h1"><a href="#chapter-${article.chapterSlug}">${escapeHtml(article.chapterTitle)}</a></li>`
      )
    }

    parts.push(
      `    <li class="toc-h2"><a href="#article-${article.slug}">${escapeHtml(article.title)}</a></li>`
    )
  }

  parts.push("  </ul>")
  parts.push("</section>")
  return parts.join("\n")
}

function renderChapterTitlePageHtml(
  chapterSlug: string,
  chapterTitle: string,
  chapterNumber: number,
  label: string
): string {
  return [
    `<section id="chapter-${chapterSlug}" class="chapter-title-page">`,
    `  <p class="chapter-number">${label} ${chapterNumber}</p>`,
    `  <h1>${escapeHtml(chapterTitle)}</h1>`,
    "</section>",
  ].join("\n")
}

function renderArticleHtml(
  article: LinearizedArticle,
  htmlContent: string
): string {
  if (!htmlContent) return ""
  return [
    `<article id="article-${article.slug}" class="chapter-content">`,
    htmlContent,
    "</article>",
  ].join("\n")
}

// ---------------------------------------------------------------------------
// Image resolution helper (exported for use by generate-pdf.ts)
// ---------------------------------------------------------------------------

/**
 * Rewrite relative image `src` attributes in rendered HTML to absolute
 * `file://` URLs so that Playwright's `page.setContent()` can load them.
 *
 * @param html           Rendered HTML content
 * @param articleFilePath Relative article file path (used to resolve images)
 * @returns HTML with resolved image URLs
 */
export function resolveImagesInHtml(
  html: string,
  articleFilePath: string | null
): string {
  if (!articleFilePath) return html

  const fullArticlePath = path.join(ARTICLES_PATH, articleFilePath)

  return html.replace(
    /<img\s+([^>]*?)(?:src\s*=\s*"([^"]*?)")([^>]*?)\/?\s*>/gi,
    (match, before, src, after) => {
      // Skip data URIs, external URLs, and already-resolved file:// URLs
      if (
        src.startsWith("data:") ||
        src.startsWith("http://") ||
        src.startsWith("https://") ||
        src.startsWith("file://")
      ) {
        return match
      }

      const resolved = resolveImageUrl(src, fullArticlePath)
      if (resolved && resolved !== src) {
        return `<img ${before}src="${resolved}"${after}>`
      }
      return match
    }
  )
}

// ---------------------------------------------------------------------------
// Default renderer
// ---------------------------------------------------------------------------

/**
 * Default render function that reads article markdown from disk and processes
 * it through the PDF markdown pipeline.
 */
export async function defaultRenderArticle(
  article: LinearizedArticle
): Promise<string> {
  const content = await getArticleContentForPdf(article.slug)
  if (!content) return ""

  const html = await renderMarkdownToHtml(content, {
    articlePath: article.filePath ?? undefined,
  })

  // Resolve relative image paths to file:// URLs for Playwright
  return resolveImagesInHtml(html, article.filePath)
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Assemble a complete ebook HTML document from linearized articles.
 *
 * The returned HTML includes embedded CSS, cover page, TOC, chapter dividers,
 * and rendered article content — everything needed for Playwright
 * `page.setContent()` and `page.pdf()`.
 */
export async function buildEbookHtml(options: EbookOptions): Promise<string> {
  const labels = LOCALE_LABELS[options.locale ?? "en"]
  const printCss = loadPrintCss()
  const renderArticle = options.renderArticle ?? defaultRenderArticle

  const sections: EbookSection[] = []

  // ── 1. Cover page ──────────────────────────────────────────────────────
  sections.push({
    type: "cover",
    title: options.title,
    htmlContent: renderCoverHtml(options),
  })

  // ── 2. Table of Contents ───────────────────────────────────────────────
  sections.push({
    type: "toc",
    title: labels.tocTitle,
    htmlContent: renderTocHtml(options.articles, labels),
  })

  // ── 3. Preface, chapters, appendix (in linearized order) ───────────────
  let lastChapterSlug = ""
  let chapterNumber = 0

  for (const article of options.articles) {
    // Preface articles: no chapter divider, render inline after cover/toc
    if (article.isPreface) {
      const html = await renderArticle(article)
      if (html) {
        sections.push({
          type: "preface",
          title: article.title,
          slug: article.slug,
          htmlContent: renderArticleHtml(article, html),
        })
      }
      continue
    }

    // Detect chapter boundary (chapterSlug changes from previous article)
    if (article.chapterSlug && article.chapterSlug !== lastChapterSlug) {
      chapterNumber++
      lastChapterSlug = article.chapterSlug

      const isAppendix = article.isAppendix
      const label = isAppendix ? labels.appendix : labels.chapter
      const sectionType = isAppendix ? "appendix-intro" : "chapter-intro"

      sections.push({
        type: sectionType,
        title: article.chapterTitle,
        slug: article.chapterSlug,
        htmlContent: renderChapterTitlePageHtml(
          article.chapterSlug,
          article.chapterTitle,
          chapterNumber,
          label
        ),
      })
    }

    // Render article content
    const html = await renderArticle(article)
    if (html) {
      const sectionType = article.isAppendix
        ? "appendix-article"
        : "chapter-article"

      sections.push({
        type: sectionType,
        title: article.title,
        slug: article.slug,
        htmlContent: renderArticleHtml(article, html),
      })
    }
  }

  // ── 4. Assemble final HTML document ────────────────────────────────────
  const katexCss = options.hasMath
    ? `  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">\n`
    : ""

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    `  <title>${escapeHtml(options.title)}</title>`,
    `  <style>${printCss}</style>`,
    katexCss.trimEnd(),
    "</head>",
    "<body>",
    ...sections.map((s) => s.htmlContent),
    "</body>",
    "</html>",
  ].join("\n")
}
