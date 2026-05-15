import type { TreeNode } from "@/types/sidebar-tree"
import { getLocalizedArticleEntry } from "./article-manifest"

interface FlatArticle {
  slug: string
  title: string
  parentPath: string
}

interface ArticleInfo {
  slug: string
  title: string
  isCrossFolder: boolean
  chapterTitle?: string
}

interface NavigationResult {
  prev: ArticleInfo | null
  next: ArticleInfo | null
}

export function flattenArticleTree(tree: TreeNode[]): FlatArticle[] {
  const result: FlatArticle[] = []

  function dfs(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (!node.isFolder) {
        const parentPath = node.isReadmeIntro
          ? node.slug
          : node.slug.split("/").slice(0, -1).join("/")
        result.push({
          slug: node.slug,
          title: node.title,
          parentPath,
        })
      }
      if (node.children.length > 0) {
        dfs(node.children)
      }
    }
  }

  dfs(tree)
  return result
}

export interface ArticleNavigationEntry {
  filePath: string
  slug: string
  index: number
  isFolder: boolean
  children?: ArticleNavigationEntry[]
}

function compareIndex(a: number, b: number): number {
  const aNoIndex = a === -1
  const bNoIndex = b === -1

  if (aNoIndex !== bNoIndex) {
    return aNoIndex ? 1 : -1
  }

  if (aNoIndex && bNoIndex) {
    return 0
  }

  return a - b
}

export function getFirstArticleInChapter(
  articles: ArticleNavigationEntry[]
): ArticleNavigationEntry | null {
  if (!articles || articles.length === 0) {
    return null
  }

  const sorted = [...articles].sort((a, b) => {
    const indexCmp = compareIndex(a.index, b.index)
    if (indexCmp !== 0) {
      return indexCmp
    }

    const aFileName = a.filePath.split("/").pop() || ""
    const bFileName = b.filePath.split("/").pop() || ""
    return aFileName.localeCompare(bFileName)
  })

  return sorted[0]
}

export function getArticleNavigation(
  currentSlug: string,
  articles: FlatArticle[],
  locale: "en" | "zh" = "zh"
): NavigationResult {
  const currentIndex = articles.findIndex((a) => a.slug === currentSlug)

  if (currentIndex === -1) {
    return { prev: null, next: null }
  }

  const getChapterTitle = (slug: string): string | undefined => {
    const entry = getLocalizedArticleEntry(slug, locale)
    const chapterTitle = entry?.chapterTitle
    if (chapterTitle) {
      return chapterTitle
    }
    const parts = slug.split("/")
    return parts.length > 1 ? parts[parts.length - 2] : undefined
  }

  const prev =
    currentIndex > 0
      ? {
          slug: articles[currentIndex - 1].slug,
          title: articles[currentIndex - 1].title,
          isCrossFolder:
            articles[currentIndex - 1].parentPath !==
            articles[currentIndex].parentPath,
          chapterTitle: getChapterTitle(articles[currentIndex - 1].slug),
        }
      : null

  const next =
    currentIndex < articles.length - 1
      ? {
          slug: articles[currentIndex + 1].slug,
          title: articles[currentIndex + 1].title,
          isCrossFolder:
            articles[currentIndex + 1].parentPath !==
            articles[currentIndex].parentPath,
          chapterTitle: getChapterTitle(articles[currentIndex + 1].slug),
        }
      : null

  return { prev, next }
}
