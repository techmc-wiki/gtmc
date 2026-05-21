import path from "node:path"

import { ARTICLES_PATH } from "@/lib/article-fs"
import type { LinearizedArticle } from "@/lib/articles/linearize"
import { getArticleContentForPdf } from "@/lib/articles/linearize"
import { resolveImageUrl } from "@/lib/pdf/image-resolver"
import { renderMarkdownToHtml } from "@/lib/pdf/markdown-pipeline"

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

/**
 * Default render function that reads article markdown from disk and processes
 * it through the PDF markdown pipeline.
 */
export async function defaultRenderArticle(
  article: LinearizedArticle,
  locale: string
): Promise<string> {
  const content = await getArticleContentForPdf(
    article.slug,
    locale as "en" | "zh"
  )
  if (!content) return ""

  const html = await renderMarkdownToHtml(content, {
    articlePath: article.filePath ?? undefined,
    articleSlug: article.slug,
  })

  // Resolve relative image paths to file:// URLs for Playwright
  return resolveImagesInHtml(html, article.filePath)
}
