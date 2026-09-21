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
 * Produces a flat, filesystem-safe filename for a given article slug.
 *
 * Encoding strategy: `encodeURIComponent(slug).replace(/%/g, "~")`
 *
 * This ensures the output never contains `/` (which would create directory
 * boundaries) or `%` (which can be misinterpreted in some filesystem contexts).
 * The tilde (`~`) is chosen as a safe, printable ASCII replacement for `%`.
 *
 * @example
 *   artifactFilename("preface")                      // => "preface"
 *   artifactFilename("TreeFarm/foo")                 // => "TreeFarm~2Ffoo"
 *   artifactFilename("Components&Features/活塞")      // => "Components~26Features~2F~E6~B4~BB~E5~A1~9E"
 */
export function artifactFilename(slug: string): string {
  return encodeURIComponent(slug).replaceAll('%', "~")
}

/**
 * Parses a raw JSON string as an ArticleContentArtifact generated in this repository.
 */
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
 * Loads an article content artifact by slug and locale from `data/articles/{locale}/`.
 *
 * Reads the JSON artifact file produced by `scripts/generate-article-content.ts`.
 * In development, returns `null` (with a warning) if the file is missing or
 * malformed. In production, throws an error: callers handle not-found via
 * `notFound()`.
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
