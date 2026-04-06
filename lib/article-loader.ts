import fs from "fs"
import path from "path"
import { type ArticleTreeNode } from "./github-repo-client"
import { type SlugMapEntry } from "./slug-resolver"

export type ArticleLocale = "en" | "zh"

export interface LocalizedArticleMetadata {
  chapterTitle: string
  introTitle: string
}

const ARTICLES_DIR = path.join(process.cwd(), "articles")
const SUBMODULE_GIT = path.join(ARTICLES_DIR, ".git")
const SLUG_MAP_PATH = path.join(process.cwd(), "lib/slug-map.json")

const slugMap: Record<string, SlugMapEntry> = (() => {
  try {
    const raw = fs.readFileSync(SLUG_MAP_PATH, "utf-8")
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const normalized: Record<string, SlugMapEntry> = {}

    for (const [slugKey, value] of Object.entries(parsed)) {
      if (typeof value !== "object" || value === null) continue

      const entry = value as Partial<SlugMapEntry>
      if (typeof entry.filePath !== "string") continue

      normalized[slugKey] = {
        filePath: entry.filePath,
        slug: typeof entry.slug === "string" ? entry.slug : slugKey,
        title: typeof entry.title === "string" ? entry.title : undefined,
        chapterTitle:
          typeof entry.chapterTitle === "string" ? entry.chapterTitle : "",
        chapterTitleEn:
          typeof entry.chapterTitleEn === "string" ? entry.chapterTitleEn : "",
        introTitle:
          typeof entry.introTitle === "string" ? entry.introTitle : "",
        introTitleEn:
          typeof entry.introTitleEn === "string" ? entry.introTitleEn : "",
        hasIntro:
          typeof entry.hasIntro === "boolean"
            ? entry.hasIntro
            : (typeof entry.introTitle === "string" &&
                entry.introTitle !== "") ||
              (typeof entry.introTitleEn === "string" &&
                entry.introTitleEn !== ""),
        index: typeof entry.index === "number" ? entry.index : 0,
        isFolder: entry.isFolder === true,
        isAppendix: entry.isAppendix === true,
        isPreface: entry.isPreface === true,
        parentSlug:
          typeof entry.parentSlug === "string" ? entry.parentSlug : undefined,
        children: Array.isArray(entry.children)
          ? (entry.children as SlugMapEntry[])
          : undefined,
        author: typeof entry.author === "string" ? entry.author : undefined,
        coAuthors: Array.isArray(entry.coAuthors) ? entry.coAuthors : undefined,
        date: typeof entry.date === "string" ? entry.date : undefined,
        lastmod: typeof entry.lastmod === "string" ? entry.lastmod : undefined,
        isAdvanced: entry.isAdvanced === true,
      }
    }

    return normalized
  } catch {
    return {}
  }
})()

export function isSubmoduleAvailable(): boolean {
  return fs.existsSync(SUBMODULE_GIT)
}

export async function getArticleContent(
  filePath: string
): Promise<string | null> {
  if (isSubmoduleAvailable()) {
    const localPath = path.join(ARTICLES_DIR, filePath)
    try {
      return fs.readFileSync(localPath, "utf-8")
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[article-loader] File not in submodule: ${filePath}, falling back to API`
        )
      }
    }
  }
  if (process.env.NODE_ENV === "development" && !isSubmoduleAvailable()) {
    console.warn("[article-loader] Submodule not available, using API")
  }
  return null
}

export async function getArticleTree(
  locale: ArticleLocale = "zh"
): Promise<ArticleTreeNode[]> {
  if (isSubmoduleAvailable()) {
    try {
      return buildLocalTree(locale)
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[article-loader] Failed to build local tree, falling back to API"
        )
      }
    }
  }
  if (process.env.NODE_ENV === "development" && !isSubmoduleAvailable()) {
    console.warn("[article-loader] Submodule not available, using API for tree")
  }
  return []
}

export function getLocalizedArticleMetadata(
  entry: SlugMapEntry | null | undefined,
  locale: ArticleLocale = "zh"
): LocalizedArticleMetadata {
  if (!entry) {
    return {
      chapterTitle: "",
      introTitle: "",
    }
  }

  const chapterTitle =
    locale === "en"
      ? entry.chapterTitleEn.trim() || entry.chapterTitle.trim()
      : entry.chapterTitle.trim()

  const introTitle =
    locale === "en"
      ? entry.introTitleEn.trim() || entry.introTitle.trim()
      : entry.introTitle.trim()

  return {
    chapterTitle,
    introTitle,
  }
}

export function getLocalizedSlugMapEntry(
  slugPath: string,
  locale: ArticleLocale = "zh"
): (SlugMapEntry & LocalizedArticleMetadata) | null {
  const entry = slugMap[slugPath]
  if (!entry) {
    return null
  }

  return {
    ...entry,
    ...getLocalizedArticleMetadata(entry, locale),
  }
}

function buildLocalTree(locale: ArticleLocale): ArticleTreeNode[] {
  const entries = Object.values(slugMap)
  if (entries.length === 0) {
    return []
  }

  const parentIndex = new Map<string, SlugMapEntry[]>()
  for (const entry of entries) {
    if (!entry.parentSlug) continue
    const siblings = parentIndex.get(entry.parentSlug) ?? []
    siblings.push(entry)
    parentIndex.set(entry.parentSlug, siblings)
  }

  const roots = entries
    .filter((entry) => !entry.parentSlug || !slugMap[entry.parentSlug])
    .sort((a, b) => compareEntries(a, b, locale))

  return roots.map((entry) => buildTreeNode(entry, parentIndex, locale))
}

function buildTreeNode(
  entry: SlugMapEntry,
  parentIndex: Map<string, SlugMapEntry[]>,
  locale: ArticleLocale
): ArticleTreeNode {
  const childrenFromSlug = entry.children ?? []
  const childrenFromParent = parentIndex.get(entry.slug) ?? []

  const mergedChildrenBySlug = new Map<string, SlugMapEntry>()
  for (const child of childrenFromSlug) {
    mergedChildrenBySlug.set(child.slug, slugMap[child.slug] ?? child)
  }
  for (const child of childrenFromParent) {
    mergedChildrenBySlug.set(child.slug, child)
  }

  const children = Array.from(mergedChildrenBySlug.values())
    .sort((a, b) => compareEntries(a, b, locale))
    .map((child) => buildTreeNode(child, parentIndex, locale))

  const localizedMetadata = getLocalizedArticleMetadata(entry, locale)

  const node: ArticleTreeNode & {
    index: number
    isAppendix: boolean
    isPreface: boolean
    introTitle?: string
    isAdvanced?: boolean
  } = {
    id: entry.isFolder ? entry.slug : entry.filePath.replace(/\.md$/i, ""),
    title: getNodeTitle(entry, locale),
    slug: entry.slug,
    isFolder: entry.isFolder,
    index: entry.index,
    isAppendix: entry.isAppendix,
    isPreface: entry.isPreface,
    introTitle: localizedMetadata.introTitle,
    isAdvanced: entry.isAdvanced,
    parentId: entry.parentSlug ?? null,
    children,
  }

  return node
}

function compareEntries(
  a: SlugMapEntry,
  b: SlugMapEntry,
  locale: ArticleLocale
): number {
  if (a.isFolder === b.isFolder) {
    return getNodeTitle(a, locale).localeCompare(getNodeTitle(b, locale))
  }
  return a.isFolder ? -1 : 1
}

function getNodeTitle(entry: SlugMapEntry, locale: ArticleLocale): string {
  const { chapterTitle } = getLocalizedArticleMetadata(entry, locale)

  if (entry.isPreface) {
    return (
      entry.title || chapterTitle || entry.slug.split("/").pop() || entry.slug
    )
  }

  if (entry.isFolder) {
    return chapterTitle || entry.slug.split("/").pop() || entry.slug
  }

  if (entry.isAppendix) {
    return (
      chapterTitle ||
      entry.title ||
      entry.filePath.split("/").pop()?.replace(/\.md$/i, "") ||
      entry.slug.split("/").pop() ||
      entry.slug
    )
  }

  return (
    chapterTitle ||
    entry.title ||
    entry.filePath.split("/").pop()?.replace(/\.md$/i, "") ||
    entry.slug.split("/").pop() ||
    entry.slug
  )
}

export async function getArticleBuffer(
  filePath: string
): Promise<Buffer | null> {
  if (isSubmoduleAvailable()) {
    const localPath = path.join(ARTICLES_DIR, filePath)
    try {
      return fs.readFileSync(localPath)
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[article-loader] Buffer not in submodule: ${filePath}, falling back to API`
        )
      }
    }
  }
  return null
}
