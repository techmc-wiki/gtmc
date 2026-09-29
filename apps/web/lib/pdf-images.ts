import path from "node:path"
import { pathToFileURL } from "node:url"

import { ARTICLES_PATH } from "@/lib/articles/fs"
import { hasExplicitUrlScheme } from "@/lib/markdown/url-utils"

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
      return resolved && resolved !== src
        ? `<img ${before}src="${resolved}"${after}>`
        : match
    }
  )
}
