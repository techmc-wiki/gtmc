import path from "node:path"
import { pathToFileURL } from "node:url"

import { ARTICLES_PATH } from "@/lib/article-fs-constants"
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

export const IMAGES_BASE_DIR: string = ARTICLES_PATH

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
export function classifyImagePath(imageSrc: string): ImagePathType {
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
export function resolveImagePath(
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

// ---------------------------------------------------------------------------
// Self-test (run directly with tsx: npx tsx lib/pdf/image-resolver.ts)
// ---------------------------------------------------------------------------
function runTests(): void {
  const assert = (condition: boolean, label: string): void => {
    if (!condition) {
      console.error(`  ✗ FAIL: ${label}`)
      process.exitCode = 1
    } else {
      console.log(`  ✓ ${label}`)
    }
  }

  // --- classifyImagePath ---
  console.log("\nclassifyImagePath:")

  assert(
    classifyImagePath("./img/test.png") === "relative",
    '"./img/test.png" → relative'
  )
  assert(
    classifyImagePath("img/test.png") === "relative",
    '"img/test.png" → relative'
  )
  assert(
    classifyImagePath("../img/test.png") === "relative",
    '"../img/test.png" → relative'
  )
  assert(
    classifyImagePath("https://example.com/img.png") === "external",
    '"https://example.com/img.png" → external'
  )
  assert(
    classifyImagePath("http://example.com/img.png") === "external",
    '"http://example.com/img.png" → external'
  )
  assert(
    classifyImagePath("/img/foo.png") === "absolute",
    '"/img/foo.png" → absolute'
  )
  assert(
    classifyImagePath("data:image/png;base64,abc") === "data-uri",
    '"data:image/png;base64,abc" → data-uri'
  )

  // --- resolveImagePath ---
  console.log("\nresolveImagePath:")

  // Relative path from BlockUpdate/article.md
  const r1 = resolveImagePath(
    "./img/test.png",
    "/project/articles/BlockUpdate/article.md"
  )
  assert(
    r1 === "/project/articles/BlockUpdate/img/test.png",
    `"./img/test.png" from BlockUpdate/article.md → ${r1}`
  )

  // Relative without ./
  const r2 = resolveImagePath(
    "img/test.png",
    "/project/articles/BlockUpdate/article.md"
  )
  assert(
    r2 === "/project/articles/BlockUpdate/img/test.png",
    `"img/test.png" from BlockUpdate/article.md → ${r2}`
  )

  // Parent-relative
  const r3 = resolveImagePath(
    "../img/test.png",
    "/project/articles/BlockUpdate/sub/article.md"
  )
  assert(
    r3 === "/project/articles/BlockUpdate/img/test.png",
    `"../img/test.png" from BlockUpdate/sub/article.md → ${r3}`
  )

  // External URL passthrough
  const r4 = resolveImagePath(
    "https://example.com/img.png",
    "/project/articles/any/article.md"
  )
  assert(
    r4 === "https://example.com/img.png",
    `external URL passthrough → ${r4}`
  )

  // Data URI passthrough
  const r5 = resolveImagePath(
    "data:image/png;base64,abc123",
    "/project/articles/any/article.md"
  )
  assert(r5 === "data:image/png;base64,abc123", `data URI passthrough → ${r5}`)

  // Empty src
  const r6 = resolveImagePath("", "/project/articles/any/article.md")
  assert(r6 === null, "empty src → null")

  // Absolute path (leading /) — resolves to IMAGES_BASE_DIR + path
  const r7 = resolveImagePath(
    "/img/shared.png",
    "/project/articles/any/article.md"
  )
  assert(
    r7 === `${IMAGES_BASE_DIR}/img/shared.png`,
    `"/img/shared.png" → ${r7}`
  )

  // URL-encoded characters
  const r8 = resolveImagePath(
    "./img/4gt%20birch%20layout1.png",
    "/project/articles/TreeFarm/article.md"
  )
  assert(
    r8 === "/project/articles/TreeFarm/img/4gt birch layout1.png",
    `URL-encoded %20 decoded → ${r8}`
  )

  // --- resolveImageUrl ---
  console.log("\nresolveImageUrl:")

  const u1 = resolveImageUrl(
    "./img/test.png",
    "/project/articles/BlockUpdate/article.md"
  )
  assert(
    u1 === "file:///project/articles/BlockUpdate/img/test.png",
    `file:// URL for relative path → ${u1}`
  )

  const u2 = resolveImageUrl(
    "https://example.com/img.png",
    "/project/articles/any/article.md"
  )
  assert(
    u2 === "https://example.com/img.png",
    `external URL passthrough → ${u2}`
  )

  const u3 = resolveImageUrl(
    "data:image/png;base64,abc123",
    "/project/articles/any/article.md"
  )
  assert(u3 === "data:image/png;base64,abc123", `data URI passthrough → ${u3}`)

  const u4 = resolveImageUrl(
    "./img/4gt%20birch%20layout1.png",
    "/project/articles/TreeFarm/article.md"
  )
  assert(
    u4 === "file:///project/articles/TreeFarm/img/4gt%20birch%20layout1.png",
    `file:// URL with encoded space → ${u4}`
  )

  const u5 = resolveImageUrl("", "/project/articles/any/article.md")
  assert(u5 === null, "empty src → null")

  console.log("\nAll tests completed.\n")
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith("image-resolver.ts") ||
    process.argv[1].endsWith("image-resolver.js"))
) {
  runTests()
}
