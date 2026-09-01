import {
  getArticleManifest,
  type ArticleEntry,
} from "@/lib/articles/manifest"

export { getArticleManifest }
export type { ArticleEntry }

export interface ResolveResult {
  filePath: string | null
}

/**
 * Resolves a slug path to its corresponding file path.
 * @param slugPath - The slug path to resolve (e.g., "tree-farm/basics")
 * @returns The file path if found, null otherwise
 */
export async function resolveSlug(slugPath: string): Promise<string | null> {
  const result = await resolveSlugWithIndicator(slugPath)
  return result.filePath
}

/**
 * Resolves a slug path with indicator for raw file path fallback.
 */
async function resolveSlugWithIndicator(
  slugPath: string
): Promise<ResolveResult> {
  const manifest = await getArticleManifest()

  // 1. Direct slug lookup
  if (manifest[slugPath] !== undefined) {
    return { filePath: manifest[slugPath].filePath }
  }

  // 2. Try with .md extension in article manifest
  if (manifest[`${slugPath}.md`] !== undefined) {
    return {
      filePath: manifest[`${slugPath}.md`].filePath,
    }
  }

  return { filePath: null }
}


export function encodeSlug(slug: string): string {
  return slug.split("/").map(encodeURIComponent).join("/")
}

export function decodeSlugPath(segments: string[]): string {
  return segments.map(decodeURIComponent).join("/")
}

export function getSlugTail(slug: string): string {
  return slug.split("/").pop() ?? slug
}

/**
 * Slug validation regex and utility function.
 *
 * Valid slug format:
 * - Lowercase letters and numbers only
 * - Hyphens allowed between segments (not at start/end)
 * - Examples: "tree-farm", "basics", "advanced-techniques", "01-introduction"
 */

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Validates if a string is a valid slug.
 * @param slug - The string to validate
 * @returns true if valid slug format, false otherwise
 */
export function validateSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug)
}
