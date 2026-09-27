import fs from "fs"
import path from "path"
import { cacheLife, cacheTag } from "next/cache"

import type { CodeReference } from "@/lib/markdown/code-provenance"
import type { ArticleLocale, TranslationStatusDetail } from "./manifest"

export interface ArticleContentArtifact {
  content: string
  frontmatter: Record<string, unknown>
  codeReferences: CodeReference[]
  translationStatus?: TranslationStatusDetail
}

/**
 * Maps a slug to the stable, flat filename used by generated article artifacts.
 * Percent escapes are represented with `~` so `/` cannot create directories and
 * persisted artifact paths remain compatible.
 */
export function artifactFilename(slug: string): string {
  return encodeURIComponent(slug).replaceAll('%', "~")
}

function parseArticleContentArtifact(
  raw: string,
  slug: string,
  artifactPath: string
): ArticleContentArtifact | null {
  try {
    return JSON.parse(raw) as ArticleContentArtifact
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[article-content-store] Invalid JSON in artifact for slug "${slug}": ${artifactPath}`
      )
      return null
    }
    throw new Error(
      `[article-content-store] Invalid JSON in artifact for slug "${slug}": ${artifactPath}`
    )
  }

}

/**
 * Loads the artifact under `data/articles/{locale}/`. Missing and malformed
 * artifacts yield `null` only in development; production throws.
 */
export async function getArticleContentBySlug(
  slug: string,
  locale: ArticleLocale
): Promise<ArticleContentArtifact | null> {
  "use cache"
  cacheLife("max")
  cacheTag(`article-${locale}-${slug}`)
  if (locale !== "zh" && locale !== "en") {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[article-content-store] Invalid locale "${locale}" for slug "${slug}"`
      )
      return null
    }
    throw new Error(
      `[article-content-store] Invalid locale "${locale}" for slug "${slug}"`
    )
  }

  const filePath = path.join(
    process.cwd(),
    "data",
    "articles",
    locale,
    `${artifactFilename(slug)}.json`
  )

  let raw: string

  try {
    raw = fs.readFileSync(filePath, "utf-8")
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[article-content-store] Missing artifact for slug "${slug}": ${filePath}`
      )
      return null
    }

    throw new Error(
      `[article-content-store] Failed to load artifact for slug "${slug}": ${filePath}`,
      { cause: error }
    )
  }

  return parseArticleContentArtifact(raw, slug, filePath)
}
