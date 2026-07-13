import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"
import { getLocalizedArticleEntry } from "./manifest"

interface FlatArticle {
  slug: string
  title: string
  parentPath: string
  chapterTitle?: string
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

function visitArticleNodes(
  nodes: ChapterNavNode[],
  visitor: (node: ChapterNavNode, parent: ChapterNavNode | null) => void,
  parent: ChapterNavNode | null = null
): void {
  for (const node of nodes) {
    if (!node.isFolder) {
      visitor(node, parent)
    }
    if (node.children.length > 0) {
      visitArticleNodes(node.children, visitor, node)
    }
  }
}

export function flattenArticleNodes(tree: ChapterNavNode[]): ChapterNavNode[] {
  const articles: ChapterNavNode[] = []
  visitArticleNodes(tree, (node) => articles.push(node))
  return articles
}

export function flattenArticleTree(tree: ChapterNavNode[]): FlatArticle[] {
  const result: FlatArticle[] = []

  visitArticleNodes(tree, (node, parent) => {
    const inferredParentPath = node.isReadmeIntro
      ? node.slug
      : node.slug.split("/").slice(0, -1).join("/")
    const parentPath = parent?.slug || inferredParentPath
    result.push({
      slug: node.slug,
      title: node.title,
      parentPath,
      ...(parent ? { chapterTitle: parent.title } : {}),
    })
  })
  return result
}

export interface ArticleNavigationEntry {
  filePath: string
  slug: string
  index: number
  isFolder: boolean
  children?: ArticleNavigationEntry[]
}

export function compareIndex(a: number, b: number): number {
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

  const sorted = [...articles].toSorted((a, b) => {
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

export async function getArticleNavigation(
  currentSlug: string,
  articles: FlatArticle[],
  locale: "en" | "zh" = "zh"
): Promise<NavigationResult> {
  const currentIndex = articles.findIndex((a) => a.slug === currentSlug)

  if (currentIndex === -1) {
    return { prev: null, next: null }
  }

  const getChapterTitle = async (article: FlatArticle): Promise<string | undefined> => {
    if (article.chapterTitle) {
      return article.chapterTitle
    }

    if (!article.parentPath) {
      return undefined
    }

    const entry = await getLocalizedArticleEntry(article.parentPath, locale)
    const chapterTitle =
      entry?.chapterTitle || entry?.titleByLocale[locale]?.trim()
    if (chapterTitle) {
      return chapterTitle
    }

    const parts = article.parentPath.split("/")
    return parts.at(-1)
  }

  const prev =
    currentIndex > 0
      ? {
          slug: articles[currentIndex - 1].slug,
          title: articles[currentIndex - 1].title,
          isCrossFolder:
            articles[currentIndex - 1].parentPath !==
            articles[currentIndex].parentPath,
          chapterTitle: await getChapterTitle(articles[currentIndex - 1]),
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
          chapterTitle: await getChapterTitle(articles[currentIndex + 1]),
        }
      : null

  return { prev, next }
}
