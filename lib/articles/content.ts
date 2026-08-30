import fs from "fs"
import path from "path"
import { cacheLife, cacheTag } from "next/cache"

import type { CodeReference } from "@/lib/markdown/code-provenance"
import type { ArticleLocale, TranslationStatusDetail } from "./manifest"

export interface ArticleContentArtifact {
  slug: string
  locale: ArticleLocale
  filePath: string
  content: string
  frontmatter: Record<string, unknown>
  codeReferences: CodeReference[]
  translationStatus?: TranslationStatusDetail
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isToolReference(value: unknown): boolean {
  if (!isRecord(value) || typeof value.name !== "string") return false
  return value.version === undefined || typeof value.version === "string"
}

function isLineRange(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (
    typeof value.start !== "number" ||
    !Number.isInteger(value.start) ||
    value.start < 1
  ) {
    return false
  }
  return (
    value.end === undefined ||
    (typeof value.end === "number" &&
      Number.isInteger(value.end) &&
      value.end >= value.start)
  )
}

function isCodeReference(value: unknown, expectedIndex: number): boolean {
  if (!isRecord(value)) return false
  if (
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    value.blockIndex !== expectedIndex ||
    value.language !== "java" ||
    typeof value.minecraftVersion !== "string" ||
    !isToolReference(value.mapping) ||
    typeof value.codeHash !== "string" ||
    value.codeHash.length === 0 ||
    typeof value.markdownLine !== "number" ||
    !Number.isInteger(value.markdownLine) ||
    value.markdownLine < 1
  ) {
    return false
  }
  if (
    value.decompiler !== undefined &&
    !isToolReference(value.decompiler)
  ) {
    return false
  }
  if (value.file !== undefined && typeof value.file !== "string") return false
  return value.lines === undefined || isLineRange(value.lines)
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
 * The reverse mapping is unnecessary because the original slug is stored
 * inside the artifact JSON, so decoding can be done via artifact content.
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
  if (obj.locale !== "zh" && obj.locale !== "en") return fail("locale")
  if (typeof obj.filePath !== "string") return fail("filePath")
  if (typeof obj.content !== "string") return fail("content")
  if (
    typeof obj.frontmatter !== "object" ||
    obj.frontmatter === null ||
    Array.isArray(obj.frontmatter)
  ) {
    return fail("frontmatter")
  }
  if (
    !Array.isArray(obj.codeReferences) ||
    !obj.codeReferences.every((reference, index) =>
      isCodeReference(reference, index)
    )
  ) {
    return fail("codeReferences")
  }
  if (obj.translationStatus !== undefined) {
    if (
      typeof obj.translationStatus !== "object" ||
      obj.translationStatus === null ||
      Array.isArray(obj.translationStatus)
    ) {
      return fail("translationStatus")
    }
    const status = obj.translationStatus as Record<string, unknown>
    if (
      typeof status.translatedFromRevision !== "string" ||
      typeof status.latestOriginalRevision !== "string" ||
      typeof status.commitLag !== "number" ||
      !Number.isInteger(status.commitLag) ||
      status.commitLag < 0 ||
      typeof status.dayLag !== "number" ||
      !Number.isInteger(status.dayLag) ||
      status.dayLag < 0 ||
      typeof status.latestOriginalCommitUrl !== "string"
    ) {
      return fail("translationStatus")
    }
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
 * Loads an article content artifact by slug and locale from `data/articles/{locale}/`.
 *
 * Reads the JSON artifact file produced by `scripts/generate-article-content.ts`.
 * In development, returns `null` (with a warning) if the file is missing or
 * malformed. In production, throws an error — callers handle not-found via
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
