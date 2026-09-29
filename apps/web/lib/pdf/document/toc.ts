import { formatChapterLabel, getLabels } from "./labels"
import { escapeHtml } from "./html-utils"
import type {
  BookPlan,
  ChapterContent,
  NumberedArticle,
  PdfLocale,
} from "./types"

function tocRow(entry: NumberedArticle, depth: number): string {
  const anchor = `article-${entry.article.slug}`
  const escapedAnchor = escapeHtml(anchor)
  const num = entry.number
    ? `<span class="toc-num">${entry.number}</span>`
    : `<span class="toc-num"></span>`
  return (
    `<li class="toc-row toc-depth-${Math.min(depth, 3)}">` +
    num +
    `<a class="toc-link" href="#${escapedAnchor}">` +
    `<span class="toc-text">${escapeHtml(entry.article.title)}</span>` +
    `</a>` +
    `<span class="toc-folio" data-anchor="${escapedAnchor}"></span>` +
    `</li>`
  )
}

function tocContentRows(content: ChapterContent[], depth: number): string[] {
  const rows: string[] = []

  for (const item of content) {
    if (item.kind === "article") {
      rows.push(tocRow(item.entry, depth))
      continue
    }

    rows.push(
      `<li class="toc-row toc-section-heading toc-depth-${Math.min(depth, 3)}">` +
        `<span class="toc-num"></span>` +
        `<span class="toc-text toc-section-title">${escapeHtml(item.title)}</span>` +
        `</li>`
    )
    rows.push(...tocContentRows(item.content, depth + 1))
  }

  return rows
}

export function renderTocHtml(plan: BookPlan, locale: PdfLocale): string {
  const labels = getLabels(locale)
  const parts: string[] = ['<section class="toc-page">']
  parts.push(`<h2 class="toc-title">${labels.tocTitle}</h2>`)

  if (plan.preface.length > 0) {
    parts.push('<ul class="toc-list toc-front-matter">')
    for (const entry of plan.preface) {
      parts.push(tocRow(entry, 0))
    }
    parts.push("</ul>")
  }

  for (const chapter of plan.chapters) {
    const chapterAnchor = `chapter-${chapter.slug}`
    const escapedChapterAnchor = escapeHtml(chapterAnchor)
    parts.push('<div class="toc-chapter">')
    parts.push(
      `<div class="toc-chapter-heading">` +
        `<span class="toc-chapter-label">${formatChapterLabel(locale, chapter.number, chapter.isAppendix)}</span>` +
        `<a class="toc-chapter-title" href="#${escapedChapterAnchor}">${escapeHtml(chapter.title)}</a>` +
        `<span class="toc-folio" data-anchor="${escapedChapterAnchor}"></span>` +
        `</div>`
    )
    parts.push('<ul class="toc-list">')
    parts.push(...tocContentRows(chapter.content, 1))
    parts.push("</ul>")
    parts.push("</div>")
  }

  parts.push("</section>")
  return parts.join("\n")
}
