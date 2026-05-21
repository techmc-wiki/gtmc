import { routing } from "@/i18n/routing"
import { type ArticleTreeNode } from "@/lib/github"

export type ArticleLocale = "en" | "zh"

export const MANIFEST_FILE_NAME = "manifest.json"

function getNodeBuiltin<T>(name: string): T {
  const getBuiltinModule = (
    process as typeof process & {
      getBuiltinModule?: (id: string) => unknown
    }
  ).getBuiltinModule

  if (getBuiltinModule) {
    return getBuiltinModule(name) as T
  }

  const nodeRequire = (0, eval)("require") as NodeRequire
  return nodeRequire(name) as T
}

export function getManifestPath(): string {
  const path = getNodeBuiltin<typeof import("path")>("path")
  return path.join(process.cwd(), "data", MANIFEST_FILE_NAME)
}

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
  bannerByLocale?: Partial<Record<ArticleLocale, { src: string; alt?: string }>>
  isAdvanced?: boolean
}

export interface LocalizedArticleMetadata {
  chapterTitle: string
  introTitle: string
}

const ARTICLE_LOCALES: ArticleLocale[] = ["zh", "en"]

interface LocaleBanner {
  src: string
  alt?: string
}

export function loadArticleManifest(): Record<string, ArticleEntry> {
  let raw: string
  const manifestPath = getManifestPath()
  const fs = getNodeBuiltin<typeof import("fs")>("fs")

  try {
    raw = fs.readFileSync(manifestPath, "utf-8")
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[article-manifest] Missing article manifest: ${manifestPath}`
      )
      return {}
    }

    throw new Error(
      `[article-manifest] Failed to load article manifest: ${manifestPath}`,
      {
        cause: error,
      }
    )
  }

  return parseArticleManifest(raw, manifestPath)
}

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

let articleManifestCache: Record<string, ArticleEntry> | null = null

export function getArticleManifest(): Record<string, ArticleEntry> {
  articleManifestCache ??= loadArticleManifest()
  return articleManifestCache
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

function buildLocalTree(locale: ArticleLocale): ArticleTreeNode[] {
  const manifest = getArticleManifest()
  const entries = Object.values(manifest)
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
    .filter((entry) => !entry.parentSlug || !manifest[entry.parentSlug])
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
  const manifest = getArticleManifest()
  const childrenFromSlug = entry.children ?? []
  const childrenFromParent = parentIndex.get(entry.slug) ?? []

  const mergedChildrenBySlug = new Map<string, ArticleEntry>()
  for (const child of childrenFromSlug) {
    mergedChildrenBySlug.set(child.slug, manifest[child.slug] ?? child)
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
  const entry = getArticleManifest()[slugPath]
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
