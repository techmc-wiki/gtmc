import matter from "gray-matter"

export interface SourceFrontMatter {
  slug: string
  title: string
  description?: string
  index: number
  "is-advanced"?: boolean
  revising?: boolean
  appendix?: boolean
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
  appendix?: boolean
  revising?: boolean
}

export interface TranslationReadmeFrontMatter {
  translates: string
  "chapter-title": string
  "intro-title"?: string
}

type BannerFrontMatter = { src: string; alt?: string }

const ALLOWED_KEYS: Record<string, readonly string[]> = {
  source: [
    "skip",
    "slug",
    "title",
    "description",
    "index",
    "is-advanced",
    "revising",
    "appendix",
    "banner",
  ],
  translation: [
    "skip",
    "translates",
    "translated-from-revision",
    "title",
    "description",
    "banner",
  ],
  sourceReadme: [
    "skip",
    "slug",
    "chapter-title",
    "intro-title",
    "index",
    "appendix",
    "revising",
  ],
  translationReadme: [
    "skip",
    "translates",
    "translated-from-revision",
    "chapter-title",
    "intro-title",
  ],
}

function parseIndex(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) return value
  if (typeof value === "string") {
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed)) return parsed
  }
  return -1
}

function parseBanner(value: unknown): BannerFrontMatter | undefined {
  if (typeof value !== "object" || value === null) return undefined
  const obj = value as Record<string, unknown>
  if (typeof obj.src !== "string") return undefined
  return {
    src: obj.src,
    alt: typeof obj.alt === "string" ? obj.alt : undefined,
  }
}

function parseFrontMatter(content: string, variant: keyof typeof ALLOWED_KEYS) {
  const { data } = matter(content)
  const raw = data as Record<string, unknown>
  const allowed = ALLOWED_KEYS[variant]
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) {
      throw new Error(`unknown key '${key}' not allowed`)
    }
  }
  return raw
}

export function shouldSkipArticleFile(content: string): boolean {
  const { data } = matter(content)
  return (data as Record<string, unknown>).skip === true
}

export function parseSourceFrontMatter(content: string): SourceFrontMatter {
  const raw = parseFrontMatter(content, "source")
  const slug = raw.slug
  const title = raw.title
  if (typeof slug !== "string" || slug === "") {
    throw new Error(`missing required key 'slug'`)
  }
  if (typeof title !== "string" || title === "") {
    throw new Error(`missing required key 'title'`)
  }
  return {
    slug,
    title,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    index: parseIndex(raw.index),
    "is-advanced": raw["is-advanced"] === true ? true : undefined,
    revising: raw.revising === true ? true : undefined,
    appendix: raw.appendix === true ? true : undefined,
    banner: parseBanner(raw.banner),
  }
}

export function parseTranslationFrontMatter(
  content: string
): TranslationFrontMatter {
  const raw = parseFrontMatter(content, "translation")
  const translates = raw.translates
  if (typeof translates !== "string" || translates === "") {
    throw new Error(`missing required key 'translates'`)
  }
  return {
    translates,
    title: typeof raw.title === "string" ? raw.title : undefined,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    banner: parseBanner(raw.banner),
  }
}

export function parseSourceReadmeFrontMatter(
  content: string
): SourceReadmeFrontMatter {
  const raw = parseFrontMatter(content, "sourceReadme")
  const slug = raw.slug
  const chapterTitle = raw["chapter-title"]
  if (typeof slug !== "string") {
    throw new Error(`missing required key 'slug'`)
  }
  if (typeof chapterTitle !== "string" || chapterTitle === "") {
    throw new Error(`missing required key 'chapter-title'`)
  }
  return {
    slug,
    "chapter-title": chapterTitle,
    "intro-title":
      typeof raw["intro-title"] === "string" ? raw["intro-title"] : undefined,
    index: parseIndex(raw.index),
    appendix: raw.appendix === true ? true : undefined,
    revising: raw.revising === true ? true : undefined,
  }
}

export function parseTranslationReadmeFrontMatter(
  content: string
): TranslationReadmeFrontMatter {
  const raw = parseFrontMatter(content, "translationReadme")
  const translates = raw.translates
  const chapterTitle = raw["chapter-title"]
  if (typeof translates !== "string" || translates === "") {
    throw new Error(`missing required key 'translates'`)
  }
  if (typeof chapterTitle !== "string" || chapterTitle === "") {
    throw new Error(`missing required key 'chapter-title'`)
  }
  return {
    translates,
    "chapter-title": chapterTitle,
    "intro-title":
      typeof raw["intro-title"] === "string" ? raw["intro-title"] : undefined,
  }
}
