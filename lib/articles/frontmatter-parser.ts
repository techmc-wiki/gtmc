import matter from "gray-matter"

export interface SourceFrontMatter {
  slug: string
  title: string
  description?: string
  index: number
  "is-advanced"?: boolean
  banner?: { src: string; alt?: string }
}

export interface TranslationFrontMatter {
  translates: string
  title?: string
  description?: string
  banner?: { src: string; alt?: string }
}

export interface SourceReadmeFrontMatter {
  slug: string
  "chapter-title": string
  "intro-title"?: string
  index: number
}

export interface TranslationReadmeFrontMatter {
  translates: string
  "chapter-title": string
  "intro-title"?: string
}

type BannerFrontMatter = { src: string; alt?: string }

const SOURCE_ALLOWED_KEYS = new Set([
  "slug",
  "title",
  "description",
  "index",
  "is-advanced",
  "banner",
])

const TRANSLATION_ALLOWED_KEYS = new Set([
  "translates",
  "translated-from-revision",
  "title",
  "description",
  "banner",
])

const SOURCE_README_ALLOWED_KEYS = new Set([
  "slug",
  "chapter-title",
  "intro-title",
  "index",
])

const TRANSLATION_README_ALLOWED_KEYS = new Set([
  "translates",
  "translated-from-revision",
  "chapter-title",
  "intro-title",
])

// ─── Helpers ────────────────────────────────────────────────────────────────

function checkAdditionalProperties(
  data: Record<string, unknown>,
  allowedKeys: Set<string>
): void {
  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`unknown key '${key}' not allowed`)
    }
  }
}

function parseRequiredString(
  data: Record<string, unknown>,
  key: string
): string {
  const value = data[key]
  if (typeof value !== "string") {
    throw new Error(`missing required key '${key}'`)
  }
  return value
}

function parseRequiredNonEmptyString(
  data: Record<string, unknown>,
  key: string
): string {
  const value = parseRequiredString(data, key)
  if (value === "") {
    throw new Error(`missing required key '${key}'`)
  }
  return value
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function parseIndex(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed)) {
      return parsed
    }
  }
  return -1
}

function parseBanner(
  value: unknown
): BannerFrontMatter | undefined {
  if (typeof value !== "object" || value === null) return undefined
  const obj = value as Record<string, unknown>
  if (typeof obj.src !== "string") return undefined
  return {
    src: obj.src,
    alt: typeof obj.alt === "string" ? obj.alt : undefined,
  }
}

// ─── Parsers ────────────────────────────────────────────────────────────────

function parseFrontMatterData(content: string): Record<string, unknown> {
  const { data } = matter(content)
  return data as Record<string, unknown>
}

export function parseSourceFrontMatter(content: string): SourceFrontMatter {
  const raw = parseFrontMatterData(content)
  checkAdditionalProperties(raw, SOURCE_ALLOWED_KEYS)

  return {
    slug: parseRequiredNonEmptyString(raw, "slug"),
    title: parseRequiredNonEmptyString(raw, "title"),
    description: parseOptionalString(raw.description),
    index: parseIndex(raw.index),
    "is-advanced": raw["is-advanced"] === true ? true : undefined,
    banner: parseBanner(raw.banner),
  }
}

export function parseTranslationFrontMatter(
  content: string
): TranslationFrontMatter {
  const raw = parseFrontMatterData(content)
  checkAdditionalProperties(raw, TRANSLATION_ALLOWED_KEYS)

  return {
    translates: parseRequiredNonEmptyString(raw, "translates"),
    title: parseOptionalString(raw.title),
    description: parseOptionalString(raw.description),
    banner: parseBanner(raw.banner),
  }
}

export function parseSourceReadmeFrontMatter(
  content: string
): SourceReadmeFrontMatter {
  const raw = parseFrontMatterData(content)
  checkAdditionalProperties(raw, SOURCE_README_ALLOWED_KEYS)

  return {
    slug: parseRequiredString(raw, "slug"),
    "chapter-title": parseRequiredNonEmptyString(raw, "chapter-title"),
    "intro-title": parseOptionalString(raw["intro-title"]),
    index: parseIndex(raw.index),
  }
}

export function parseTranslationReadmeFrontMatter(
  content: string
): TranslationReadmeFrontMatter {
  const raw = parseFrontMatterData(content)
  checkAdditionalProperties(raw, TRANSLATION_README_ALLOWED_KEYS)

  return {
    translates: parseRequiredNonEmptyString(raw, "translates"),
    "chapter-title": parseRequiredNonEmptyString(raw, "chapter-title"),
    "intro-title": parseOptionalString(raw["intro-title"]),
  }
}
