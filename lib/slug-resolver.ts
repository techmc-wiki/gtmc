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

/**
 * Resolves a slug path to its corresponding file path.
 * @param slugPath - The slug path to resolve (e.g., "tree-farm/basics")
 * @returns The file path if found, null otherwise
 */
export function resolveSlug(slugPath: string): string | null {
  // 1. Direct slug lookup
  if (slugMap[slugPath] !== undefined) {
    return slugMap[slugPath]
  }

  // 2. Try with .md extension in slug map
  if (slugMap[`${slugPath}.md`] !== undefined) {
    return slugMap[`${slugPath}.md`]
  }

  // 3. Raw file path fallback - URL decode first
  const normalizedPath = slugPath.replace(/%20/g, " ")

  // 3a. Try as-is
  if (fs.existsSync(path.join(ARTICLES_DIR, normalizedPath))) {
    return normalizedPath
  }

  // 3b. Try with .md extension
  const withExt = `${normalizedPath}.md`
  if (fs.existsSync(path.join(ARTICLES_DIR, withExt))) {
    return withExt
  }

  return null
}
