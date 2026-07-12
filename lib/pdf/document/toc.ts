import { formatChapterLabel, getLabels } from "./labels"
import { escapeHtml } from "./html-utils"
import type { BookPlan, NumberedArticle, PdfLocale } from "./types"

/**
 * One TOC row: number cell, dotted-leader title link, and an empty folio
 * span. Folios are filled after the first render pass measures real page
 * numbers (see `fillTocFolios` in ../paginate.ts).
 */
function tocRow(entry: NumberedArticle, indentClass: string): string {
  const anchor = `article-${entry.article.slug}`
  const num = entry.number
    ? `<span class="toc-num">${entry.number}</span>`
    : `<span class="toc-num"></span>`
  return (
    `<li class="toc-row ${indentClass}">` +
    num +
    `<a class="toc-link" href="#${anchor}">` +
    `<span class="toc-text">${escapeHtml(entry.article.title)}</span>` +
    `</a>` +
    `<span class="toc-folio" data-anchor="${anchor}"></span>` +
    `</li>`
  )
}

export function renderTocHtml(plan: BookPlan, locale: PdfLocale): string {
  const labels = getLabels(locale)
  const parts: string[] = ['<section class="toc-page">']
  parts.push(`<h2 class="toc-title">${labels.tocTitle}</h2>`)

  if (plan.preface.length > 0) {
    parts.push('<ul class="toc-list toc-front-matter">')
    for (const entry of plan.preface) {
      parts.push(tocRow(entry, "toc-depth-0"))
    }
    parts.push("</ul>")
  }

  for (const chapter of plan.chapters) {
    parts.push('<div class="toc-chapter">')
    parts.push(
      `<div class="toc-chapter-heading">` +
        `<span class="toc-chapter-label">${formatChapterLabel(locale, chapter.number, chapter.isAppendix)}</span>` +
        `<a class="toc-chapter-title" href="#chapter-${chapter.slug}">${escapeHtml(chapter.title)}</a>` +
        `<span class="toc-folio" data-anchor="chapter-${chapter.slug}"></span>` +
        `</div>`
    )
    parts.push('<ul class="toc-list">')
    for (const entry of chapter.articles) {
      parts.push(tocRow(entry, `toc-depth-${Math.min(entry.article.depth, 3)}`))
    }
    parts.push("</ul>")
    parts.push("</div>")
  }

  parts.push("</section>")
  return parts.join("\n")
}
