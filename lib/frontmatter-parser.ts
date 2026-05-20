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
  allowedKeys: Set<string>,
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
  value: unknown,
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
  options: ParseSourceFrontMatterOptions = {},
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
      typeof raw["intro-title"] === "string"
        ? raw["intro-title"]
        : undefined,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    index: parseIndex(raw.index),
    "is-advanced": raw["is-advanced"] === true ? true : undefined,
    banner: parseBanner(raw.banner),
  }
}

export function parseTranslationFrontMatter(
  content: string,
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
      typeof raw["intro-title"] === "string"
        ? raw["intro-title"]
        : undefined,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    banner: parseBanner(raw.banner),
  }
}

// ─── Deprecated backward-compat aliases ─────────────────────────────────────

export interface FrontMatterData {
  title?: string
  titleEn?: string
  chapterTitle?: string
  chapterTitleEn?: string
  introTitle?: string
  introTitleEn?: string
  author?: string
  coAuthors?: string
  date?: string
  lastmod?: string
  index: number
  isAdvanced?: boolean
}

/**
 * @deprecated Use `parseSourceFrontMatter` or `parseTranslationFrontMatter` instead.
 */
export function parseFrontMatter(content: string): FrontMatterData {
  try {
    const { data } = matter(content)

    const title =
      data.title && typeof data.title === "string"
        ? data.title.trim() || ""
        : undefined
    const titleEn =
      data["title-en"] && typeof data["title-en"] === "string"
        ? data["title-en"].trim() || undefined
        : undefined
    const chapterTitle =
      data["chapter-title"] && typeof data["chapter-title"] === "string"
        ? data["chapter-title"].trim() || ""
        : undefined
    const chapterTitleEn =
      data["chapter-title-en"] && typeof data["chapter-title-en"] === "string"
        ? data["chapter-title-en"].trim() || ""
        : undefined
    const introTitle =
      data["intro-title"] && typeof data["intro-title"] === "string"
        ? data["intro-title"].trim() || ""
        : undefined
    const introTitleEn =
      data["intro-title-en"] && typeof data["intro-title-en"] === "string"
        ? data["intro-title-en"].trim() || ""
        : undefined
    const author =
      data.author && typeof data.author === "string"
        ? data.author.trim() || ""
        : undefined
    const coAuthors =
      data["co-authors"] && typeof data["co-authors"] === "string"
        ? data["co-authors"].trim() || ""
        : undefined
    const date =
      data.date && typeof data.date === "string"
        ? data.date.trim() || ""
        : undefined
    const lastmod =
      data.lastmod && typeof data.lastmod === "string"
        ? data.lastmod.trim() || ""
        : undefined

    let index = -1
    if (typeof data.index === "number" && Number.isInteger(data.index)) {
      index = data.index
    } else if (typeof data.index === "string") {
      const parsed = parseInt(data.index, 10)
      if (!isNaN(parsed)) {
        index = parsed
      }
    }

    const isAdvanced = data["is-advanced"] === true

    return {
      title,
      titleEn,
      chapterTitle,
      chapterTitleEn,
      introTitle,
      introTitleEn,
      author,
      coAuthors,
      date,
      lastmod,
      index,
      isAdvanced,
    }
  } catch {
    return { index: -1 }
  }
}
