import fs from "fs"
import path from "path"

import type { ArticleLocale } from "./article-manifest"
import { MANIFEST_FILE_NAME } from "./article-manifest-constants"

export { MANIFEST_FILE_NAME }

export const MANIFEST_PATH = path.join(
  process.cwd(),
  "data",
  MANIFEST_FILE_NAME
)

export interface ArticleEntry {
  filePath: string
  slug: string
  title?: string
  titleEn?: string
  availableLocales: ArticleLocale[]
  localizedFilePaths: Partial<Record<ArticleLocale, string>>
  chapterTitle: string
  chapterTitleEn: string
  introTitle: string
  introTitleEn: string
  hasIntro: boolean
  index: number
  isFolder: boolean
  isAppendix: boolean
  isPreface: boolean
  children?: ArticleEntry[]
  parentSlug?: string
  author?: string
  coAuthors?: string[]
  date?: string
  lastmod?: string
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
  return typeof value === "string" && ARTICLE_LOCALES.includes(value as ArticleLocale)
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

function normalizeArticleEntry(
  slugKey: string,
  value: unknown
): ArticleEntry | null {
  if (typeof value !== "object" || value === null) return null

  const entry = value as Partial<ArticleEntry>
  if (typeof entry.filePath !== "string") return null

  return {
    filePath: entry.filePath,
    slug: typeof entry.slug === "string" ? entry.slug : slugKey,
    title: typeof entry.title === "string" ? entry.title : undefined,
    titleEn: typeof entry.titleEn === "string" ? entry.titleEn : undefined,
    availableLocales: normalizeAvailableLocales(entry.availableLocales),
    localizedFilePaths: normalizeLocalizedFilePaths(entry.localizedFilePaths),
    chapterTitle:
      typeof entry.chapterTitle === "string" ? entry.chapterTitle : "",
    chapterTitleEn:
      typeof entry.chapterTitleEn === "string" ? entry.chapterTitleEn : "",
    introTitle: typeof entry.introTitle === "string" ? entry.introTitle : "",
    introTitleEn:
      typeof entry.introTitleEn === "string" ? entry.introTitleEn : "",
    hasIntro:
      typeof entry.hasIntro === "boolean"
        ? entry.hasIntro
        : (typeof entry.introTitle === "string" && entry.introTitle !== "") ||
          (typeof entry.introTitleEn === "string" && entry.introTitleEn !== ""),
    index: typeof entry.index === "number" ? entry.index : 0,
    isFolder: entry.isFolder === true,
    isAppendix: entry.isAppendix === true,
    isPreface: entry.isPreface === true,
    children: Array.isArray(entry.children)
      ? entry.children
          .map((child) => normalizeArticleEntry(slugKey, child))
          .filter((child): child is ArticleEntry => child !== null)
      : undefined,
    parentSlug: typeof entry.parentSlug === "string" ? entry.parentSlug : undefined,
    author: typeof entry.author === "string" ? entry.author : undefined,
    coAuthors: Array.isArray(entry.coAuthors) ? entry.coAuthors : undefined,
    date: typeof entry.date === "string" ? entry.date : undefined,
    lastmod: typeof entry.lastmod === "string" ? entry.lastmod : undefined,
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
