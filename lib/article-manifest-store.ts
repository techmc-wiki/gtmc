import fs from "fs"
import path from "path"

import type { ArticleLocale } from "./article-manifest"

export const MANIFEST_FILE_NAME = "manifest.json"

export const MANIFEST_PATH = path.join(
  process.cwd(),
  "data",
  MANIFEST_FILE_NAME
)

export interface ArticleEntry {
  filePath: string
  slug: string
  titleByLocale: Partial<Record<ArticleLocale, string>>
  availableLocales: ArticleLocale[]
  localizedFilePaths: Partial<Record<ArticleLocale, string>>
  chapterTitleByLocale: Partial<Record<ArticleLocale, string>>
  introTitleByLocale: Partial<Record<ArticleLocale, string>>
  descriptionByLocale: Partial<Record<ArticleLocale, string>>
  hasIntro: boolean
  index: number
  isFolder: boolean
  isAppendix: boolean
  isPreface: boolean
  children?: ArticleEntry[]
  parentSlug?: string
  /** generator-derived from git, never read from frontmatter */
  author?: string
  /** generator-derived from git, never read from frontmatter */
  coAuthors?: string[]
  created?: string
  lastmodByLocale: Partial<Record<ArticleLocale, string>>
  translatedFromRevisionByLocale: Partial<
    Record<Exclude<ArticleLocale, "zh">, string>
  >
  translationFreshnessByLocale: Partial<
    Record<Exclude<ArticleLocale, "zh">, "fresh" | "stale" | "unknown">
  >
  bannerByLocale?: Partial<
    Record<ArticleLocale, { src: string; alt?: string }>
  >
  isAdvanced?: boolean
}

export function loadArticleManifest(): Record<string, ArticleEntry> {
  let raw: string

  try {
    raw = fs.readFileSync(MANIFEST_PATH, "utf-8")
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[article-manifest] Missing article manifest: ${MANIFEST_PATH}`
      )
      return {}
    }

    throw new Error(
      `[article-manifest] Failed to load article manifest: ${MANIFEST_PATH}`,
      {
        cause: error,
      }
    )
  }

  return parseArticleManifest(raw, MANIFEST_PATH)
}

const ARTICLE_LOCALES: ArticleLocale[] = ["zh", "en"]

function isArticleLocale(value: unknown): value is ArticleLocale {
  return (
    typeof value === "string" &&
    ARTICLE_LOCALES.includes(value as ArticleLocale)
  )
}

function normalizeAvailableLocales(value: unknown): ArticleLocale[] {
  if (!Array.isArray(value)) return ["zh"]

  const locales = value.filter(isArticleLocale)
  return locales.length > 0 ? locales : ["zh"]
}

function normalizeLocalizedFilePaths(
  value: unknown
): Partial<Record<ArticleLocale, string>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }

  const paths: Partial<Record<ArticleLocale, string>> = {}
  for (const locale of ARTICLE_LOCALES) {
    const filePath = (value as Partial<Record<ArticleLocale, unknown>>)[locale]
    if (typeof filePath === "string") {
      paths[locale] = filePath
    }
  }

  return paths
}

function normalizeStringByLocale(
  value: unknown
): Partial<Record<ArticleLocale, string>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }

  const record: Partial<Record<ArticleLocale, string>> = {}
  for (const locale of ARTICLE_LOCALES) {
    const val = (value as Partial<Record<ArticleLocale, unknown>>)[locale]
    if (typeof val === "string") {
      record[locale] = val
    }
  }

  return record
}

function normalizeFreshnessByLocale(
  value: unknown
): Partial<
  Record<Exclude<ArticleLocale, "zh">, "fresh" | "stale" | "unknown">
> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }

  const valid = new Set(["fresh", "stale", "unknown"])
  const record: Partial<
    Record<Exclude<ArticleLocale, "zh">, "fresh" | "stale" | "unknown">
  > = {}

  for (const locale of ARTICLE_LOCALES) {
    if (locale === "zh") continue
    const val = (value as Partial<Record<ArticleLocale, unknown>>)[locale]
    if (typeof val === "string" && valid.has(val)) {
      record[locale as Exclude<ArticleLocale, "zh">] = val as
        | "fresh"
        | "stale"
        | "unknown"
    }
  }

  return record
}

interface LocaleBanner {
  src: string
  alt?: string
}

function normalizeBannerByLocale(
  value: unknown
): Partial<Record<ArticleLocale, LocaleBanner>> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined
  }

  const record: Partial<Record<ArticleLocale, LocaleBanner>> = {}
  for (const locale of ARTICLE_LOCALES) {
    const val = (value as Partial<Record<ArticleLocale, unknown>>)[locale]
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      const banner = val as Record<string, unknown>
      if (typeof banner.src === "string") {
        record[locale] = {
          src: banner.src,
          alt: typeof banner.alt === "string" ? banner.alt : undefined,
        }
      }
    }
  }

  return Object.keys(record).length > 0 ? record : undefined
}

function normalizeArticleEntry(
  slugKey: string,
  value: unknown
): ArticleEntry | null {
  if (typeof value !== "object" || value === null) return null

  const entry = value as Record<string, unknown>
  if (typeof entry.filePath !== "string") return null

  // Reject legacy manifest entries with flat suffixed fields
  if (
    "titleEn" in entry ||
    "chapterTitleEn" in entry ||
    "introTitleEn" in entry
  ) {
    console.error(
      `[article-manifest] Detected legacy manifest shape for "${slugKey}": ` +
        "flat *En fields are no longer supported. " +
        "Migrate to per-locale record fields (titleByLocale, chapterTitleByLocale, etc.)."
    )
    return null
  }

  const introByLocale = normalizeStringByLocale(entry.introTitleByLocale)

  return {
    filePath: entry.filePath as string,
    slug: typeof entry.slug === "string" ? entry.slug : slugKey,
    titleByLocale: normalizeStringByLocale(entry.titleByLocale),
    availableLocales: normalizeAvailableLocales(entry.availableLocales),
    localizedFilePaths: normalizeLocalizedFilePaths(entry.localizedFilePaths),
    chapterTitleByLocale: normalizeStringByLocale(entry.chapterTitleByLocale),
    introTitleByLocale: introByLocale,
    descriptionByLocale: normalizeStringByLocale(entry.descriptionByLocale),
    hasIntro:
      typeof entry.hasIntro === "boolean"
        ? entry.hasIntro
        : Object.values(introByLocale).some((t) => t !== ""),
    index: typeof entry.index === "number" ? entry.index : 0,
    isFolder: entry.isFolder === true,
    isAppendix: entry.isAppendix === true,
    isPreface: entry.isPreface === true,
    children: Array.isArray(entry.children)
      ? entry.children
          .map((child: unknown) => normalizeArticleEntry(slugKey, child))
          .filter((child): child is ArticleEntry => child !== null)
      : undefined,
    parentSlug:
      typeof entry.parentSlug === "string" ? entry.parentSlug : undefined,
    author: typeof entry.author === "string" ? entry.author : undefined,
    coAuthors: Array.isArray(entry.coAuthors) ? entry.coAuthors : undefined,
    created: typeof entry.created === "string" ? entry.created : undefined,
    lastmodByLocale: normalizeStringByLocale(entry.lastmodByLocale),
    translatedFromRevisionByLocale: normalizeStringByLocale(
      entry.translatedFromRevisionByLocale
    ) as Partial<Record<Exclude<ArticleLocale, "zh">, string>>,
    translationFreshnessByLocale: normalizeFreshnessByLocale(
      entry.translationFreshnessByLocale
    ),
    bannerByLocale: normalizeBannerByLocale(entry.bannerByLocale),
    isAdvanced: entry.isAdvanced === true,
  }
}

function parseArticleManifest(
  raw: string,
  manifestPath: string
): Record<string, ArticleEntry> {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const normalized: Record<string, ArticleEntry> = {}

    for (const [slugKey, value] of Object.entries(parsed)) {
      const entry = normalizeArticleEntry(slugKey, value)
      if (entry !== null) normalized[slugKey] = entry
    }

    return normalized
  } catch (error) {
    throw new Error(
      `[article-manifest] Failed to parse article manifest: ${manifestPath}`,
      {
        cause: error,
      }
    )
  }
}

export const ArticleManifest: Record<string, ArticleEntry> =
  loadArticleManifest()
