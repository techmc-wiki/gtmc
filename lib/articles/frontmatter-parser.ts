import matter from "gray-matter"

// ─── New API ────────────────────────────────────────────────────────────────

export interface SourceFrontMatter {
  slug: string
  title: string
  "chapter-title"?: string
  "intro-title"?: string
  description?: string
  index: number
  "is-advanced"?: boolean
  banner?: { src: string; alt?: string }
}

export interface TranslationFrontMatter {
  translates: string
  "translated-from-revision": string
  title?: string
  "chapter-title"?: string
  "intro-title"?: string
  description?: string
  banner?: { src: string; alt?: string }
}

interface ParseSourceFrontMatterOptions {
  allowTitlelessFolder?: boolean
}

// ─── Allowed / legacy key sets ─────────────────────────────────────────────

const SOURCE_ALLOWED_KEYS = new Set([
  "slug",
  "title",
  "chapter-title",
  "intro-title",
  "description",
  "index",
  "is-advanced",
  "banner",
])

const TRANSLATION_ALLOWED_KEYS = new Set([
  "translates",
  "translated-from-revision",
  "title",
  "chapter-title",
  "intro-title",
  "description",
  "banner",
])

const LEGACY_KEYS = new Set([
  "title-en",
  "chapter-title-en",
  "intro-title-en",
  "date",
  "lastmod",
  "author",
  "co-authors",
])

// ─── Helpers ────────────────────────────────────────────────────────────────

function checkLegacyKeys(data: Record<string, unknown>): void {
  for (const key of Object.keys(data)) {
    if (LEGACY_KEYS.has(key)) {
      throw new Error(`legacy key '${key}' not allowed`)
    }
  }
}

function checkAdditionalProperties(
  data: Record<string, unknown>,
  allowedKeys: Set<string>
): void {
  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key) && !LEGACY_KEYS.has(key)) {
      throw new Error(`unknown key '${key}' not allowed`)
    }
  }
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
): { src: string; alt?: string } | undefined {
  if (typeof value !== "object" || value === null) return undefined
  const obj = value as Record<string, unknown>
  if (typeof obj.src !== "string") return undefined
  return {
    src: obj.src,
    alt: typeof obj.alt === "string" ? obj.alt : undefined,
  }
}

// ─── Parsers ────────────────────────────────────────────────────────────────

export function parseSourceFrontMatter(
  content: string,
  options: ParseSourceFrontMatterOptions = {}
): SourceFrontMatter {
  const { data } = matter(content)
  const raw = data as Record<string, unknown>

  checkLegacyKeys(raw)
  checkAdditionalProperties(raw, SOURCE_ALLOWED_KEYS)

  if (typeof raw.slug !== "string" || raw.slug === "") {
    throw new Error("missing required key 'slug'")
  }
  const title = typeof raw.title === "string" ? raw.title : ""

  if (!options.allowTitlelessFolder && title === "") {
    throw new Error("missing required key 'title'")
  }

  return {
    slug: raw.slug,
    title,
    "chapter-title":
      typeof raw["chapter-title"] === "string"
        ? raw["chapter-title"]
        : undefined,
    "intro-title":
      typeof raw["intro-title"] === "string" ? raw["intro-title"] : undefined,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    index: parseIndex(raw.index),
    "is-advanced": raw["is-advanced"] === true ? true : undefined,
    banner: parseBanner(raw.banner),
  }
}

export function parseTranslationFrontMatter(
  content: string
): TranslationFrontMatter {
  const { data } = matter(content)
  const raw = data as Record<string, unknown>

  checkLegacyKeys(raw)
  checkAdditionalProperties(raw, TRANSLATION_ALLOWED_KEYS)

  if (typeof raw.translates !== "string" || raw.translates === "") {
    throw new Error("missing required key 'translates'")
  }
  if (
    typeof raw["translated-from-revision"] !== "string" ||
    raw["translated-from-revision"] === ""
  ) {
    throw new Error("missing required key 'translated-from-revision'")
  }

  return {
    translates: raw.translates,
    "translated-from-revision": raw["translated-from-revision"],
    title: typeof raw.title === "string" ? raw.title : undefined,
    "chapter-title":
      typeof raw["chapter-title"] === "string"
        ? raw["chapter-title"]
        : undefined,
    "intro-title":
      typeof raw["intro-title"] === "string" ? raw["intro-title"] : undefined,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    banner: parseBanner(raw.banner),
  }
}
