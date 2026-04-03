import fs from "fs"
import path from "path"
import { type ArticleTreeNode } from "./github-repo-client"
import { type SlugMapEntry } from "./slug-resolver"

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

export async function getArticleTree(): Promise<ArticleTreeNode[]> {
  if (isSubmoduleAvailable()) {
    try {
      return buildLocalTree()
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

function buildLocalTree(): ArticleTreeNode[] {
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
    .sort(compareEntries)

  return roots.map((entry) => buildTreeNode(entry, parentIndex))
}

function buildTreeNode(
  entry: SlugMapEntry,
  parentIndex: Map<string, SlugMapEntry[]>
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
    .sort(compareEntries)
    .map((child) => buildTreeNode(child, parentIndex))

  const node: ArticleTreeNode & {
    index: number
    isAppendix: boolean
    isPreface: boolean
    introTitle?: string
  } = {
    id: entry.isFolder ? entry.slug : entry.filePath.replace(/\.md$/i, ""),
    title: getNodeTitle(entry),
    slug: entry.slug,
    isFolder: entry.isFolder,
    index: entry.index,
    isAppendix: entry.isAppendix,
    isPreface: entry.isPreface,
    introTitle: entry.introTitle,
    parentId: entry.parentSlug ?? null,
    children,
  }

  return node
}

function compareEntries(a: SlugMapEntry, b: SlugMapEntry): number {
  if (a.isFolder === b.isFolder) {
    return getNodeTitle(a).localeCompare(getNodeTitle(b))
  }
  return a.isFolder ? -1 : 1
}

function getNodeTitle(entry: SlugMapEntry): string {
  if (entry.isPreface) {
    return (
      entry.title ||
      entry.chapterTitle ||
      entry.slug.split("/").pop() ||
      entry.slug
    )
  }

  if (entry.isFolder) {
    return entry.chapterTitle || entry.slug.split("/").pop() || entry.slug
  }

  if (entry.isAppendix) {
    return (
      entry.chapterTitle ||
      entry.chapterTitleEn ||
      entry.title ||
      entry.filePath.split("/").pop()?.replace(/\.md$/i, "") ||
      entry.slug.split("/").pop() ||
      entry.slug
    )
  }

  return (
    entry.chapterTitle ||
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
