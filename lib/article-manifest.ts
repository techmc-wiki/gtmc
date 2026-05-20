import { type ArticleTreeNode } from "@/lib/github"
import { routing } from "@/i18n/routing"
import { ArticleManifest, type ArticleEntry } from "./article-manifest-store"

export type ArticleLocale = "en" | "zh"

export interface LocalizedArticleMetadata {
  chapterTitle: string
  introTitle: string
}

const localTreeCache = new Map<ArticleLocale, ArticleTreeNode[]>()

/**
 * Builds the article navigation tree for a locale.
 *
 * Consumer boundaries should pass an explicit locale. The zh default is kept
 * only for backward compatibility with existing internal callers.
 */
export async function getArticleTree(
  locale: ArticleLocale = "zh"
): Promise<ArticleTreeNode[]> {
  const cached = localTreeCache.get(locale)
  if (cached) return cached

  try {
    const tree = buildLocalTree(locale)
    localTreeCache.set(locale, tree)
    return tree
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[article-manifest] Failed to build local tree from article manifest",
        error
      )
    }
  }

  return []
}

export function getLocalizedArticleMetadata(
  entry: ArticleEntry | null | undefined,
  locale: ArticleLocale = "zh"
): LocalizedArticleMetadata {
  if (!entry) {
    return {
      chapterTitle: "",
      introTitle: "",
    }
  }

  const chapterTitle = entry.chapterTitleByLocale[locale]?.trim() || ""

  const introTitle = entry.introTitleByLocale[locale]?.trim() || ""

  return {
    chapterTitle,
    introTitle,
  }
}

export function getLocalizedArticleEntry(
  slugPath: string,
  locale: ArticleLocale = "zh"
): (ArticleEntry & LocalizedArticleMetadata) | null {
  const entry = ArticleManifest[slugPath]
  if (!entry) {
    return null
  }

  return {
    ...entry,
    ...getLocalizedArticleMetadata(entry, locale),
  }
}

export {
  hasArticleLocale,
  getArticleAvailableLocales,
  getArticleLocalizedFilePath,
} from "./article-locale"

function buildLocalTree(locale: ArticleLocale): ArticleTreeNode[] {
  const entries = Object.values(ArticleManifest)
  if (entries.length === 0) {
    return []
  }

  const parentIndex = new Map<string, ArticleEntry[]>()
  for (const entry of entries) {
    if (!entry.parentSlug) continue
    const siblings = parentIndex.get(entry.parentSlug) ?? []
    siblings.push(entry)
    parentIndex.set(entry.parentSlug, siblings)
  }

  const roots = entries
    .filter((entry) => !entry.parentSlug || !ArticleManifest[entry.parentSlug])
    .sort((a, b) => compareEntries(a, b, locale))

  return roots
    .map((entry) => buildTreeNode(entry, parentIndex, locale))
    .filter((node): node is ArticleTreeNode => node !== null)
}

function buildTreeNode(
  entry: ArticleEntry,
  parentIndex: Map<string, ArticleEntry[]>,
  locale: ArticleLocale
): ArticleTreeNode | null {
  const childrenFromSlug = entry.children ?? []
  const childrenFromParent = parentIndex.get(entry.slug) ?? []

  const mergedChildrenBySlug = new Map<string, ArticleEntry>()
  for (const child of childrenFromSlug) {
    mergedChildrenBySlug.set(child.slug, ArticleManifest[child.slug] ?? child)
  }
  for (const child of childrenFromParent) {
    mergedChildrenBySlug.set(child.slug, child)
  }

  const children = Array.from(mergedChildrenBySlug.values())
    .sort((a, b) => compareEntries(a, b, locale))
    .map((child) => buildTreeNode(child, parentIndex, locale))
    .filter((node): node is ArticleTreeNode => node !== null)

  if (!entry.isFolder && !entry.availableLocales.includes(locale)) {
    return null
  }

  if (entry.isFolder && children.length === 0) {
    return null
  }

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
  a: ArticleEntry,
  b: ArticleEntry,
  locale: ArticleLocale
): number {
  if (a.isFolder === b.isFolder) {
    return getNodeTitle(a, locale).localeCompare(getNodeTitle(b, locale))
  }
  return a.isFolder ? -1 : 1
}

function getNodeTitle(entry: ArticleEntry, locale: ArticleLocale): string {
  const { chapterTitle } = getLocalizedArticleMetadata(entry, locale)
  const fileTitle = entry.filePath.split("/").pop()?.replace(/\.md$/i, "")

  if (locale === routing.defaultLocale) {
    return (
      entry.titleByLocale[locale]?.trim() ||
      chapterTitle ||
      fileTitle ||
      entry.slug.split("/").pop() ||
      entry.slug
    )
  }

  if (entry.isPreface) {
    return (
      entry.titleByLocale[locale]?.trim() ||
      chapterTitle ||
      entry.slug.split("/").pop() ||
      entry.slug
    )
  }

  if (entry.isFolder) {
    return chapterTitle || entry.slug.split("/").pop() || entry.slug
  }

  if (entry.isAppendix) {
    return (
      chapterTitle ||
      entry.titleByLocale[locale]?.trim() ||
      fileTitle ||
      entry.slug.split("/").pop() ||
      entry.slug
    )
  }

  return (
    chapterTitle ||
    entry.titleByLocale[locale]?.trim() ||
    fileTitle ||
    entry.slug.split("/").pop() ||
    entry.slug
  )
}
