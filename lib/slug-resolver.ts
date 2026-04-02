import fs from "fs"
import path from "path"

const SLUG_MAP_PATH = path.join(process.cwd(), "lib", "slug-map.json")
const ARTICLES_DIR = path.join(process.cwd(), "articles")

export interface SlugMapEntry {
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
  children?: SlugMapEntry[]
  parentSlug?: string
  author?: string
  coAuthors?: string[]
  date?: string
  lastmod?: string
}

// Load at module initialization
let slugMap: Record<string, SlugMapEntry> = {}
try {
  slugMap = JSON.parse(fs.readFileSync(SLUG_MAP_PATH, "utf-8"))
} catch {
  // File doesn't exist yet — that's ok
}

const filePathToSlugKey: Record<string, string> = (() => {
  const inverted: Record<string, string> = {}
  for (const [slugKey, entry] of Object.entries(slugMap)) {
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
  if (slugMap[slugPath] !== undefined) {
    return { filePath: slugMap[slugPath].filePath }
  }

  // 2. Try with .md extension in slug map
  if (slugMap[`${slugPath}.md`] !== undefined) {
    return {
      filePath: slugMap[`${slugPath}.md`].filePath,
    }
  }

  // 3. Raw file path fallback - URL decode first
  const normalizedPath = slugPath.replace(/%20/g, " ")

  // 3a. Try as-is
  if (fs.existsSync(path.join(ARTICLES_DIR, normalizedPath))) {
    return { filePath: normalizedPath }
  }

  // 3b. Try with .md extension
  const withExt = `${normalizedPath}.md`
  if (fs.existsSync(path.join(ARTICLES_DIR, withExt))) {
    return { filePath: withExt }
  }

  return { filePath: null }
}

/**
 * Gets the slug for a given file path if it exists in the slug map.
 */
export function getSlugForFilePath(filePath: string): string | null {
  return filePathToSlugKey[filePath.replace(/\.md$/i, "")] ?? null
}

/**
 * Gets the slug map entry for a given slug path.
 */
export function getSlugMapEntry(slugPath: string): SlugMapEntry | null {
  return slugMap[slugPath] ?? null
}
