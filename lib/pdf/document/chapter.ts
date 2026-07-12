import { formatChapterLabel, getLabels } from "./labels"
import { escapeHtml } from "./html-utils"
import type { ChapterGroup, PdfLocale } from "./types"

/**
 * Chapter opener: dot-grid page with an oversized serif numeral, azure
 * tick, chapter title, and a mini table of the chapter's articles.
 */
export function renderChapterOpenerHtml(
  chapter: ChapterGroup,
  locale: PdfLocale
): string {
  const labels = getLabels(locale)

  const items = chapter.articles
    .filter((entry) => entry.number !== null)
    .map(
      (entry) =>
        `<li><span class="chapter-list-num">${entry.number}</span>` +
        `${escapeHtml(entry.article.title)}</li>`
    )
    .join("\n      ")

  const contents = items
    ? [
        `  <div class="chapter-contents">`,
        `    <p class="chapter-contents-label">${labels.articlesInChapter}</p>`,
        `    <ul>`,
        `      ${items}`,
        `    </ul>`,
        `  </div>`,
      ].join("\n")
    : ""

  return [
    `<section id="chapter-${chapter.slug}" class="chapter-opener">`,
    `  <p class="chapter-kicker">${formatChapterLabel(locale, chapter.number, chapter.isAppendix)}</p>`,
    `  <p class="chapter-numeral">${chapter.number}</p>`,
    `  <h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>`,
    contents,
    "</section>",
  ].join("\n")
}
