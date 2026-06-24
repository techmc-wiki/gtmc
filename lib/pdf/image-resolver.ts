import path from "node:path"
import { pathToFileURL } from "node:url"

import { ARTICLES_PATH } from "@/lib/articles/fs"
import { hasExplicitUrlScheme } from "@/lib/markdown/url-utils"

/**
 * Classification of an image source path.
 *
 * - `"relative"`  – relative path (e.g. `./img/foo.png`, `img/foo.png`, `../img/foo.png`)
 * - `"external"`  – full URL with an explicit scheme (e.g. `https://example.com/img.png`)
 * - `"absolute"`  – absolute path starting with `/` (e.g. `/img/foo.png`)
 * - `"data-uri"`  – inline data URI (e.g. `data:image/png;base64,...`)
 */
export type ImagePathType = "relative" | "external" | "absolute" | "data-uri"

const IMAGES_BASE_DIR: string = ARTICLES_PATH

const DATA_URI_RE = /^data:/i

/**
 * Classifies an image source string into one of four path types.
 *
 * Detection order:
 * 1. data URI → `"data-uri"`
 * 2. explicit URL scheme (http, https, etc.) → `"external"`
 * 3. leading `/` → `"absolute"`
 * 4. everything else → `"relative"`
 */
function classifyImagePath(imageSrc: string): ImagePathType {
  if (DATA_URI_RE.test(imageSrc)) return "data-uri"
  if (hasExplicitUrlScheme(imageSrc)) return "external"
  if (imageSrc.startsWith("/")) return "absolute"
  return "relative"
}

/**
 * Resolves an image source to an absolute filesystem path.
 *
 * - **Relative** paths (`./img/…`, `img/…`, `../img/…`): resolved against the
 *   directory of `articleFilePath`.
 * - **Absolute** paths (starting with `/`): resolved relative to `ARTICLES_PATH`.
 * - **External URLs** (`https://…`, etc.): returned unchanged.
 * - **Data URIs** (`data:image/…`): returned unchanged.
 *
 * URL-encoded characters (e.g. `%20`) are decoded before resolution so that
 * files with spaces on disk are found correctly.
 *
 * @param imageSrc       The image source from the markdown/HTML `src` attribute.
 * @param articleFilePath Full or relative path to the article markdown file.
 * @returns The resolved absolute path, or the original src for external/data-uri,
 *          or `null` when the input is empty/not a string.
 */
function resolveImagePath(
  imageSrc: string,
  articleFilePath: string
): string | null {
  if (!imageSrc || !articleFilePath) return null

  const type = classifyImagePath(imageSrc)

  switch (type) {
    case "data-uri":
    case "external":
      return imageSrc

    case "absolute": {
      const decoded = decodeURIComponent(imageSrc)
      const relative = decoded.replace(/^\//, "")
      return path.join(IMAGES_BASE_DIR, relative)
    }

    case "relative": {
      const decoded = decodeURIComponent(imageSrc)
      const articleDir = path.dirname(articleFilePath)
      return path.resolve(articleDir, decoded)
    }
  }
}

/**
 * Resolves an image source to a URL usable by Playwright's `page.setContent()`.
 *
 * - **Relative** or **absolute** local paths are converted to `file://` URLs.
 * - **External URLs** and **data URIs** are returned as-is.
 *
 * @param imageSrc       The image source from the markdown/HTML `src` attribute.
 * @param articleFilePath Full or relative path to the article markdown file.
 * @returns A Playwright-compatible URL, or `null` when resolution fails.
 */
export function resolveImageUrl(
  imageSrc: string,
  articleFilePath: string
): string | null {
  const resolved = resolveImagePath(imageSrc, articleFilePath)

  if (resolved === null) return null
  if (hasExplicitUrlScheme(resolved)) return resolved

  try {
    return pathToFileURL(resolved).href
  } catch {
    return null
  }
}
