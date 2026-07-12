import fs from "node:fs"
import path from "node:path"

import { PDF_FONT_STYLESHEET_URL, buildThemeCssVariables } from "../theme"
import { escapeHtml } from "./html-utils"
import { renderArticleSectionHtml } from "./article"
import { renderChapterOpenerHtml } from "./chapter"
import { renderColophonHtml } from "./colophon"
import { renderCoverHtml } from "./cover"
import { renderTocHtml } from "./toc"
import type { BookOptions, BookPlan } from "./types"

const CSS_PATH = path.join(process.cwd(), "lib", "pdf", "print.css")

let cachedCss: string | null = null

function loadPrintCss(): string {
  cachedCss ??= fs.readFileSync(CSS_PATH, "utf-8")
  return cachedCss
}

function documentShell(
  options: BookOptions,
  bodyHtml: string,
  bodyClass: string,
  extraCss = ""
): string {
  const katexCss = options.hasMath
    ? '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">'
    : ""

  return [
    "<!DOCTYPE html>",
    `<html lang="${options.locale === "zh" ? "zh-CN" : "en"}">`,
    "<head>",
    '  <meta charset="utf-8">',
    `  <title>${escapeHtml(options.title)}</title>`,
    `  <link rel="stylesheet" href="${PDF_FONT_STYLESHEET_URL}">`,
    katexCss,
    `  <style>${buildThemeCssVariables()}</style>`,
    `  <style>${loadPrintCss()}</style>`,
    extraCss ? `  <style>${extraCss}</style>` : "",
    "</head>",
    `<body class="${bodyClass}">`,
    bodyHtml,
    "</body>",
    "</html>",
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * Build the single-page cover document. Rendered without running
 * header/footer and merged in front of the body PDF, so body folios stay
 * aligned with the page numbers printed in the TOC.
 */
export function buildCoverHtml(options: BookOptions): string {
  return documentShell(
    options,
    renderCoverHtml(options),
    "cover-document",
    "@page { margin: 0; }"
  )
}

/**
 * Build the body document: TOC, preface, chapters with openers, appendices,
 * and colophon. Article markdown is rendered concurrently through
 * `options.renderArticle`.
 */
export async function buildBodyHtml(
  options: BookOptions,
  plan: BookPlan
): Promise<string> {
  const allEntries = [
    ...plan.preface,
    ...plan.chapters.flatMap((c) => c.articles),
  ]

  const rendered = new Map<string, string>()
  await Promise.all(
    allEntries.map(async (entry) => {
      rendered.set(
        entry.article.slug,
        await options.renderArticle(entry.article)
      )
    })
  )

  // Drop entries whose article produced no HTML (empty drafts, load
  // failures) so the TOC never points at a section that does not exist.
  const hasContent = (slug: string) => Boolean(rendered.get(slug))
  const effectivePlan: BookPlan = {
    preface: plan.preface.filter((e) => hasContent(e.article.slug)),
    chapters: plan.chapters
      .map((chapter) => ({
        ...chapter,
        articles: chapter.articles.filter((e) => hasContent(e.article.slug)),
      }))
      .filter((chapter) => chapter.articles.length > 0),
  }

  const sections: string[] = [renderTocHtml(effectivePlan, options.locale)]

  for (const entry of effectivePlan.preface) {
    sections.push(
      renderArticleSectionHtml(entry, rendered.get(entry.article.slug)!)
    )
  }

  let renderedArticleCount = 0
  for (const chapter of effectivePlan.chapters) {
    sections.push(renderChapterOpenerHtml(chapter, options.locale))
    for (const entry of chapter.articles) {
      sections.push(
        renderArticleSectionHtml(entry, rendered.get(entry.article.slug)!)
      )
      renderedArticleCount++
    }
  }

  sections.push(renderColophonHtml(options, renderedArticleCount))

  return documentShell(options, sections.join("\n"), "body-document")
}
