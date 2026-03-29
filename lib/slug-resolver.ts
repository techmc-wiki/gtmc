import fs from "fs"
import path from "path"

const SLUG_MAP_PATH = path.join(process.cwd(), "lib", "slug-map.json")

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
  return slugMap[slugPath] ?? null
}
