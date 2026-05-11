import fs from "fs"
import path from "path"

import { MANIFEST_FILE_NAME } from "./article-manifest-constants"

export { MANIFEST_FILE_NAME }
// Keep this path module-relative so Next.js production bundles and server code
// resolve the generated JSON next to the compiled resolver instead of cwd.
export const MANIFEST_PATH = path.join(__dirname, MANIFEST_FILE_NAME)
// Turbopack can rewrite __dirname to /ROOT inside server chunks during build;
// fall back to the generated source file path used by page-data collection.
const MANIFEST_FALLBACK_PATH = path.join(
  process.cwd(),
  "lib",
  MANIFEST_FILE_NAME
)
const ARTICLES_PATH = path.join(process.cwd(), "articles")

export interface ArticleEntry {
  filePath: string
  slug: string
  title?: string
  chapterTitle: string
  chapterTitleEn: string
  introTitle: string
  introTitleEn: string
  hasIntro: boolean
  index: number
  isFolder: boolean
  isAppendix: boolean
  isPreface: boolean
  children?: ArticleEntry[]
  parentSlug?: string
  author?: string
  coAuthors?: string[]
  date?: string
  lastmod?: string
  isAdvanced?: boolean
}

export function loadArticleManifest(): Record<string, ArticleEntry> {
  const paths = [MANIFEST_PATH, MANIFEST_FALLBACK_PATH]
  let lastMissingError: unknown = null

  for (const manifestPath of paths) {
    let raw: string

    try {
      raw = fs.readFileSync(manifestPath, "utf-8")
    } catch (error) {
      if (isNodeMissingFileError(error)) {
        lastMissingError = error
        continue
      }

      throw new Error(
        `[slug-resolver] Failed to read article manifest: ${manifestPath}`,
        {
          cause: error,
        }
      )
    }

    return parseArticleManifest(raw, manifestPath)
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      `[slug-resolver] Missing article manifest: ${paths.join(" or ")}`
    )
    return {}
  }

  throw new Error(
    `[slug-resolver] Failed to load article manifest: ${paths.join(" or ")}`,
    {
      cause: lastMissingError,
    }
  )
}

function parseArticleManifest(
  raw: string,
  manifestPath: string
): Record<string, ArticleEntry> {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const normalized: Record<string, ArticleEntry> = {}

    for (const [slugKey, value] of Object.entries(parsed)) {
      if (typeof value !== "object" || value === null) continue

      const entry = value as Partial<ArticleEntry>
      if (typeof entry.filePath !== "string") continue

      normalized[slugKey] = {
        filePath: entry.filePath,
        slug: typeof entry.slug === "string" ? entry.slug : slugKey,
        title: typeof entry.title === "string" ? entry.title : undefined,
        chapterTitle:
          typeof entry.chapterTitle === "string" ? entry.chapterTitle : "",
        chapterTitleEn:
          typeof entry.chapterTitleEn === "string" ? entry.chapterTitleEn : "",
        introTitle:
          typeof entry.introTitle === "string" ? entry.introTitle : "",
        introTitleEn:
          typeof entry.introTitleEn === "string" ? entry.introTitleEn : "",
        hasIntro:
          typeof entry.hasIntro === "boolean"
            ? entry.hasIntro
            : (typeof entry.introTitle === "string" &&
                entry.introTitle !== "") ||
              (typeof entry.introTitleEn === "string" &&
                entry.introTitleEn !== ""),
        index: typeof entry.index === "number" ? entry.index : 0,
        isFolder: entry.isFolder === true,
        isAppendix: entry.isAppendix === true,
        isPreface: entry.isPreface === true,
        children: Array.isArray(entry.children)
          ? (entry.children as ArticleEntry[])
          : undefined,
        parentSlug:
          typeof entry.parentSlug === "string" ? entry.parentSlug : undefined,
        author: typeof entry.author === "string" ? entry.author : undefined,
        coAuthors: Array.isArray(entry.coAuthors) ? entry.coAuthors : undefined,
        date: typeof entry.date === "string" ? entry.date : undefined,
        lastmod: typeof entry.lastmod === "string" ? entry.lastmod : undefined,
        isAdvanced: entry.isAdvanced === true,
      }
    }

    return normalized
  } catch (error) {
    throw new Error(
      `[slug-resolver] Failed to parse article manifest: ${manifestPath}`,
      {
        cause: error,
      }
    )
  }
}

function isNodeMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  )
}

export const ArticleManifest: Record<string, ArticleEntry> =
  loadArticleManifest()

const filePathToSlugKey: Record<string, string> = (() => {
  const inverted: Record<string, string> = {}
  for (const [slugKey, entry] of Object.entries(ArticleManifest)) {
    if (entry?.filePath) {
      inverted[entry.filePath.replace(/\.md$/i, "")] = slugKey
    }
  }
  return inverted
})()

export interface ResolveResult {
  filePath: string | null
}

/**
 * Resolves a slug path to its corresponding file path.
 * @param slugPath - The slug path to resolve (e.g., "tree-farm/basics")
 * @returns The file path if found, null otherwise
 */
export function resolveSlug(slugPath: string): string | null {
  const result = resolveSlugWithIndicator(slugPath)
  return result.filePath
}

/**
 * Resolves a slug path with indicator for raw file path fallback.
 */
export function resolveSlugWithIndicator(slugPath: string): ResolveResult {
  // 1. Direct slug lookup
  if (ArticleManifest[slugPath] !== undefined) {
    return { filePath: ArticleManifest[slugPath].filePath }
  }

  // 2. Try with .md extension in article manifest
  if (ArticleManifest[`${slugPath}.md`] !== undefined) {
    return {
      filePath: ArticleManifest[`${slugPath}.md`].filePath,
    }
  }

  // 3. Raw file path fallback - URL decode first
  const normalizedPath = decodeURIComponent(slugPath)

  // 3a. Try as-is
  if (fs.existsSync(path.join(ARTICLES_PATH, normalizedPath))) {
    return { filePath: normalizedPath }
  }

  // 3b. Try with .md extension
  const withExt = `${normalizedPath}.md`
  if (fs.existsSync(path.join(ARTICLES_PATH, withExt))) {
    return { filePath: withExt }
  }

  return { filePath: null }
}

/**
 * Gets the slug for a given file path if it exists in the article manifest.
 */
export function getSlugForFilePath(filePath: string): string | null {
  return filePathToSlugKey[filePath.replace(/\.md$/i, "")] ?? null
}

/**
 * Gets the article manifest entry for a given slug path.
 */
export function getArticleEntry(slugPath: string): ArticleEntry | null {
  return ArticleManifest[slugPath] ?? null
}
