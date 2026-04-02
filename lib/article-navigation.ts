import { getSlugMapEntry } from "@/lib/slug-resolver"

interface TreeNode {
  id: string
  title: string
  slug: string
  index: number
  isAppendix: boolean
  isPreface: boolean
  isFolder: boolean
  parentId: string | null
  children: TreeNode[]
}

interface FlatArticle {
  slug: string
  title: string
  parentPath: string
}

interface ArticleInfo {
  slug: string
  title: string
  isCrossFolder: boolean
}

interface NavigationResult {
  prev: ArticleInfo | null
  next: ArticleInfo | null
}

export function flattenArticleTree(tree: TreeNode[]): FlatArticle[] {
  const result: FlatArticle[] = []

  function dfs(nodes: TreeNode[]): void {
    for (const node of nodes) {
      const hasIntroFolder =
        node.isFolder && Boolean(getSlugMapEntry(node.slug)?.hasIntro)
      if (!node.isFolder || hasIntroFolder) {
        const parentPath = node.slug.split("/").slice(0, -1).join("/")
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

export interface SlugMapEntry {
  filePath: string
  slug: string
  index: number
  isFolder: boolean
  children?: SlugMapEntry[]
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
  articles: SlugMapEntry[]
): SlugMapEntry | null {
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
  articles: FlatArticle[]
): NavigationResult {
  const currentIndex = articles.findIndex((a) => a.slug === currentSlug)

  if (currentIndex === -1) {
    return { prev: null, next: null }
  }

  const prev =
    currentIndex > 0
      ? {
          slug: articles[currentIndex - 1].slug,
          title: articles[currentIndex - 1].title,
          isCrossFolder:
            articles[currentIndex - 1].parentPath !==
            articles[currentIndex].parentPath,
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
        }
      : null

  return { prev, next }
}
