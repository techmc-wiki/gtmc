import fs from "node:fs"
import path from "node:path"

import { PDF_FONT_STYLESHEET_URL, buildThemeCssVariables } from "../theme"
import { escapeHtml } from "./html-utils"
import { renderArticleSectionHtml } from "./article"
import { renderChapterOpenerHtml } from "./chapter"
import { renderColophonHtml } from "./colophon"
import { renderCoverHtml } from "./cover"
import { renderTocHtml } from "./toc"
import type {
  BookOptions,
  BookPlan,
  ChapterContent,
  ChapterGroup,
  NumberedArticle,
} from "./types"

const CSS_PATH = path.join(process.cwd(), "lib", "pdf", "print.css")

let cachedCss: string | null = null

function contentEntries(content: ChapterContent[]): NumberedArticle[] {
  return content.flatMap((item) =>
    item.kind === "article" ? [item.entry] : contentEntries(item.content)
  )
}

function renumberChapter(chapter: ChapterGroup): ChapterGroup {
  let counter = 0

  function renumberContent(content: ChapterContent[]): ChapterContent[] {
    const numberedContent: ChapterContent[] = []

    for (const item of content) {
      if (item.kind === "folder") {
        numberedContent.push({
          kind: "folder",
          slug: item.slug,
          title: item.title,
          content: renumberContent(item.content),
        })
        continue
      }

      if (item.entry.article.isReadmeIntro) {
        numberedContent.push({
          kind: "article",
          entry: { ...item.entry, number: null },
        })
        continue
      }

      counter += 1
      numberedContent.push({
        kind: "article",
        entry: { ...item.entry, number: `${chapter.number}.${counter}` },
      })
    }

    return numberedContent
  }

  return { ...chapter, content: renumberContent(chapter.content) }
}

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
    `  <link rel="stylesheet" href="${options.fontsHref ?? PDF_FONT_STYLESHEET_URL}">`,
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
): Promise<{ html: string; plan: BookPlan }> {
  const allEntries = [
    ...plan.preface,
    ...plan.chapters.flatMap((chapter) => contentEntries(chapter.content)),
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

  const hasContent = (slug: string) => Boolean(rendered.get(slug))

  function filterContent(content: ChapterContent[]): ChapterContent[] {
    const filtered: ChapterContent[] = []

    for (const item of content) {
      if (item.kind === "article") {
        if (hasContent(item.entry.article.slug)) {
          filtered.push(item)
        }
        continue
      }

      const nested = filterContent(item.content)
      if (nested.length > 0) {
        filtered.push({ ...item, content: nested })
      }
    }

    return filtered
  }

  const effectivePlan: BookPlan = {
    preface: plan.preface.filter((e) => hasContent(e.article.slug)),
    chapters: plan.chapters
      .map((chapter) => ({
        ...chapter,
        content: filterContent(chapter.content),
      }))
      .filter((chapter) => chapter.content.length > 0)
      .map(renumberChapter),
  }

  const sections: string[] = [renderTocHtml(effectivePlan, options.locale)]

  for (const entry of effectivePlan.preface) {
    const articleHtml = rendered.get(entry.article.slug)
    if (articleHtml) {
      sections.push(renderArticleSectionHtml(entry, articleHtml))
    }
  }

  let renderedArticleCount = 0
  function renderContent(content: ChapterContent[]): void {
    for (const item of content) {
      if (item.kind === "folder") {
        sections.push(
          `<div class="section-divider">` +
            `<h2 class="section-title">${escapeHtml(item.title)}</h2>` +
            `</div>`
        )
        renderContent(item.content)
        continue
      }

      const articleHtml = rendered.get(item.entry.article.slug)
      if (articleHtml) {
        sections.push(renderArticleSectionHtml(item.entry, articleHtml))
        renderedArticleCount++
      }
    }
  }

  for (const chapter of effectivePlan.chapters) {
    sections.push(renderChapterOpenerHtml(chapter, options.locale))
    renderContent(chapter.content)
  }

  sections.push(renderColophonHtml(options, renderedArticleCount))

  return {
    html: documentShell(options, sections.join("\n"), "body-document"),
    plan: effectivePlan,
  }
}
