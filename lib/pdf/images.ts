/**
 * Image URL resolution for the PDF render.
 *
 * Article markdown references images with paths relative to the article
 * file (or absolute within the articles submodule). Playwright loads the
 * assembled document from a temp file, so local images must be rewritten
 * to `file://` URLs.
 */

import path from "node:path"
import { pathToFileURL } from "node:url"

import { ARTICLES_PATH } from "@/lib/articles/fs"
import { hasExplicitUrlScheme } from "@/lib/markdown/url-utils"

/**
 * Resolve a single image src to a Playwright-loadable URL.
 * External URLs and data URIs pass through; local paths become `file://`.
 * Returns `null` when the input can't be resolved.
 */
export function resolveImageUrl(
  imageSrc: string,
  articleFilePath: string
): string | null {
  if (!imageSrc || !articleFilePath) return null

  if (imageSrc.startsWith("data:") || hasExplicitUrlScheme(imageSrc)) {
    return imageSrc
  }

  const decoded = decodeURIComponent(imageSrc)
  const resolved = imageSrc.startsWith("/")
    ? path.join(ARTICLES_PATH, decoded.replace(/^\//, ""))
    : path.resolve(path.dirname(articleFilePath), decoded)

  try {
    return pathToFileURL(resolved).href
  } catch {
    return null
  }
}

/**
 * Rewrite relative image `src` attributes in rendered article HTML to
 * absolute `file://` URLs.
 */
export function resolveImagesInHtml(
  html: string,
  articleFilePath: string | null
): string {
  if (!articleFilePath) return html

  const fullArticlePath = path.join(ARTICLES_PATH, articleFilePath)

  return html.replaceAll(
    /<img\s+([^>]*?)(?:src\s*=\s*"([^"]*?)")([^>]*?)\/?\s*>/gi,
    (match, before, src, after) => {
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
