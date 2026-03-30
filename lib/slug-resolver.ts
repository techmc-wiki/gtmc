import fs from "fs"
import path from "path"

const SLUG_MAP_PATH = path.join(process.cwd(), "lib", "slug-map.json")
const ARTICLES_DIR = path.join(process.cwd(), "articles")

// Load at module initialization
let slugMap: Record<string, string> = {}
try {
  slugMap = JSON.parse(fs.readFileSync(SLUG_MAP_PATH, "utf-8"))
} catch {
  // File doesn't exist yet — that's ok
}

const filePathToSlugKey: Record<string, string> = (() => {
  const inverted: Record<string, string> = {}
  for (const [slugKey, filePath] of Object.entries(slugMap)) {
    inverted[filePath.replace(/\.md$/i, "")] = slugKey
  }
  return inverted
})()

export interface ResolveResult {
  filePath: string | null
  isRawPath: boolean
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
    return { filePath: slugMap[slugPath], isRawPath: false }
  }

  // 2. Try with .md extension in slug map
  if (slugMap[`${slugPath}.md`] !== undefined) {
    return { filePath: slugMap[`${slugPath}.md`], isRawPath: false }
  }

  // 3. Raw file path fallback - URL decode first
  const normalizedPath = slugPath.replace(/%20/g, " ")

  // 3a. Try as-is
  if (fs.existsSync(path.join(ARTICLES_DIR, normalizedPath))) {
    return { filePath: normalizedPath, isRawPath: true }
  }

  // 3b. Try with .md extension
  const withExt = `${normalizedPath}.md`
  if (fs.existsSync(path.join(ARTICLES_DIR, withExt))) {
    return { filePath: withExt, isRawPath: true }
  }

  return { filePath: null, isRawPath: false }
}

/**
 * Gets the slug for a given file path if it exists in the slug map.
 */
export function getSlugForFilePath(filePath: string): string | null {
  return filePathToSlugKey[filePath.replace(/\.md$/i, "")] ?? null
}
