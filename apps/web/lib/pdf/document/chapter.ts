import { formatChapterLabel, getLabels } from "./labels"
import { escapeHtml } from "./html-utils"
import type { ChapterContent, ChapterGroup, PdfLocale } from "./types"

export function renderChapterOpenerHtml(
  chapter: ChapterGroup,
  locale: PdfLocale
): string {
  const labels = getLabels(locale)

  const contentsParts: string[] = []
  function renderContents(content: ChapterContent[]): void {
    for (const item of content) {
      if (item.kind === "folder") {
        contentsParts.push(
          `<li class="chapter-section-heading">${escapeHtml(item.title)}</li>`
        )
        renderContents(item.content)
        continue
      }

      if (item.entry.number !== null) {
        contentsParts.push(
          `<li><span class="chapter-list-num">${item.entry.number}</span>` +
            `${escapeHtml(item.entry.article.title)}</li>`
        )
      }
    }
  }
  renderContents(chapter.content)

  const items = contentsParts.join("\n      ")

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
    `<section id="chapter-${escapeHtml(chapter.slug)}" class="chapter-opener">`,
    `  <p class="chapter-kicker">${formatChapterLabel(locale, chapter.number, chapter.isAppendix)}</p>`,
    `  <p class="chapter-numeral">${chapter.number}</p>`,
    `  <h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>`,
    contents,
    "</section>",
  ].join("\n")
}
