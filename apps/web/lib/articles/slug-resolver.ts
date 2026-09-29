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
 * Resolves an exact manifest key first, then an exact `.md`-suffixed key.
 */
export async function resolveSlug(slugPath: string): Promise<string | null> {
  const result = await resolveSlugResult(slugPath)
  return result.filePath
}

async function resolveSlugResult(
  slugPath: string
): Promise<ResolveResult> {
  const manifest = await getArticleManifest()

  if (manifest[slugPath] !== undefined) {
    return { filePath: manifest[slugPath].filePath }
  }

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


export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validateSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug)
}
