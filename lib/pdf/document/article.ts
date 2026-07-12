import { escapeHtml } from "./html-utils"
import type { NumberedArticle } from "./types"

/**
 * Article section: a generated heading block (number + serif title with an
 * ink rule and azure tick) followed by the rendered markdown body. Most
 * article artifacts do not carry their own H1, so the PDF supplies the
 * title uniformly; body headings start at H2.
 */
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
    `<article id="article-${article.slug}" class="article">`,
    `  <header class="article-header">`,
    `    <h1 class="article-title">${numberSpan}${escapeHtml(article.title)}</h1>`,
    `  </header>`,
    `  <div class="article-body">`,
    htmlContent,
    `  </div>`,
    "</article>",
  ].join("\n")
}
