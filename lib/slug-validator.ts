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
