import fs from "fs"
import path from "path"

import {
  type ArticleContentArtifact,
  artifactFilename,
} from "./article-content-artifact"

/**
 * Parses and validates a raw JSON string as an ArticleContentArtifact.
 *
 * Validates the shape of the parsed value at runtime, ensuring all required
 * fields exist with the correct types. In development, returns `null` with
 * a warning on failure. In production, throws an Error.
 */
function parseArticleContentArtifact(
  raw: string,
  slug: string,
  filePath: string
): ArticleContentArtifact | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[article-content-store] Invalid JSON in artifact for slug "${slug}": ${filePath}`
      )
      return null
    }
    throw new Error(
      `[article-content-store] Invalid JSON in artifact for slug "${slug}": ${filePath}`
    )
  }

  const fail = (field: string): ArticleContentArtifact | null => {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[article-content-store] Artifact for slug "${slug}" has invalid/missing field "${field}": ${filePath}`
      )
      return null
    }
    throw new Error(
      `[article-content-store] Artifact for slug "${slug}" has invalid/missing field "${field}": ${filePath}`
    )
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return fail("(root)")
  }

  const obj = parsed as Record<string, unknown>

  if (typeof obj.slug !== "string") return fail("slug")
  if (typeof obj.filePath !== "string") return fail("filePath")
  if (typeof obj.content !== "string") return fail("content")
  if (
    typeof obj.frontmatter !== "object" ||
    obj.frontmatter === null ||
    Array.isArray(obj.frontmatter)
  ) {
    return fail("frontmatter")
  }

  if (obj.slug !== slug) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[article-content-store] Artifact slug mismatch for "${slug}": expected "${slug}", got "${obj.slug}": ${filePath}`
      )
      return null
    }
    throw new Error(
      `[article-content-store] Artifact slug mismatch for "${slug}": expected "${slug}", got "${obj.slug}": ${filePath}`
    )
  }

  return obj as unknown as ArticleContentArtifact
}

/**
 * Loads an article content artifact by slug from `data/articles/`.
 *
 * Reads the JSON artifact file produced by `scripts/generate-article-content.ts`.
 * In development, returns `null` (with a warning) if the file is missing or
 * malformed. In production, throws an error — callers handle not-found via
 * `notFound()`.
 */
export function getArticleContentBySlug(
  slug: string
): ArticleContentArtifact | null {
  const filePath = path.join(
    process.cwd(),
    "data",
    "articles",
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
