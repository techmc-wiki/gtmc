import { escapeHtml } from "./html-utils"
import type { NumberedArticle } from "./types"

/** Supply a consistent H1 when article artifacts omit one. */
export function renderArticleSectionHtml(
  numbered: NumberedArticle,
  htmlContent: string
): string {
  if (!htmlContent) return ""

  const { article, number } = numbered
  const numberSpan = number
    ? `<span class="article-number">${number}</span> `
    : ""

  return [
    `<article id="article-${escapeHtml(article.slug)}" class="article">`,
    `  <header class="article-header">`,
    `    <h1 class="article-title">${numberSpan}${escapeHtml(article.title)}</h1>`,
    `  </header>`,
    `  <div class="article-body">`,
    htmlContent,
    `  </div>`,
    "</article>",
  ].join("\n")
}
