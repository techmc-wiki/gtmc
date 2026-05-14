import { unstable_cache } from "next/cache"
import { statSync } from "fs"
import { shouldIgnoreDirectory, shouldIgnoreFile } from "@/lib/article-ignore"
import { getArticleTree, type ArticleLocale } from "@/lib/article-manifest"
import { getRepoTranslations, type ArticleTreeNode } from "@/lib/github/sync"
import type { TreeNode } from "@/types/sidebar-tree"
import { MANIFEST_PATH } from "@/lib/article-manifest-store"

function isAppendixDirectoryName(name: string): boolean {
  const normalized = name.trim().toLowerCase()
  return normalized.includes("appendix") || normalized.includes("附录")
}

function isReadmeArticle(node: TreeNode): boolean {
  if (node.isFolder) {
    return false
  }

  const normalize = (value: string) =>
    value.trim().toLowerCase().replace(/\.md$/, "")
  const slugTail = node.slug.split("/").pop() ?? ""

  return normalize(node.title) === "readme" || normalize(slugTail) === "readme"
}

function getArticleManifestMtime(): string {
  const manifestPath = MANIFEST_PATH
  return statSync(manifestPath).mtime.getTime().toString()
}

const getCachedArticleTree = unstable_cache(
  async (locale: ArticleLocale) => {
    return getArticleTree(locale)
  },
  ["github-repo-tree", getArticleManifestMtime()],
  { revalidate: 60, tags: ["github-repo-tree"] }
)

const getCachedTranslations = unstable_cache(
  async () => {
    return getRepoTranslations()
  },
  ["github-sidebar-translations"],
  { revalidate: 3600, tags: ["github-repo-translations"] }
)

/**
 * 获取公开文章树状结构的目录树 (Sidebar).
 * Tree is built from the public article source only.
 */
export async function getPublicSidebarTree(
  locale: ArticleLocale = "zh"
): Promise<TreeNode[]> {
  const [githubTree, translations] = await Promise.all([
    getCachedArticleTree(locale),
    getCachedTranslations(),
  ])

  // 3. Build unified map keyed by slug
  const unifiedMap = new Map<string, TreeNode>()
  const mergedTree: TreeNode[] = []

  // Add GitHub tree
  function addGithubNodes(nodes: ArticleTreeNode[], parentArray: TreeNode[]) {
    for (const node of nodes) {
      const nodeWithMeta = node as ArticleTreeNode & Partial<TreeNode>
      const clone: TreeNode = {
        ...node,
        index: nodeWithMeta.index ?? -1,
        isAppendix: nodeWithMeta.isAppendix ?? false,
        isPreface: nodeWithMeta.isPreface ?? false,
        isAdvanced: nodeWithMeta.isAdvanced ?? false,
        introTitle: nodeWithMeta.introTitle ?? "",
        children: [],
      }
      unifiedMap.set(clone.slug.toLowerCase(), clone)
      parentArray.push(clone)
      if (node.children && node.children.length > 0) {
        addGithubNodes(node.children, clone.children)
      }
    }
  }

  addGithubNodes(githubTree, mergedTree)

  // 4. Apply translations to top-level titles
  mergedTree.forEach((node) => {
    if (translations[node.title]) {
      node.title = translations[node.title]
    }
  })

  function sortTree(nodes: TreeNode[]) {
    const compareIndex = (a: number, b: number) => {
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

    nodes.sort((a, b) => {
      if (a.isPreface !== b.isPreface) {
        return a.isPreface ? -1 : 1
      }

      if (a.isReadmeIntro !== b.isReadmeIntro) {
        return a.isReadmeIntro ? -1 : 1
      }

      if (a.isFolder && b.isFolder) {
        const indexComparison = compareIndex(a.index ?? -1, b.index ?? -1)
        if (indexComparison !== 0) {
          return indexComparison
        }
      }

      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1
      }

      if (!a.isFolder && !b.isFolder) {
        if (a.isAppendix !== b.isAppendix) {
          return a.isAppendix ? 1 : -1
        }

        const aIsReadme =
          !a.title || a.title === "" || a.slug.toLowerCase().endsWith("/readme")
        const bIsReadme =
          !b.title || b.title === "" || b.slug.toLowerCase().endsWith("/readme")
        if (aIsReadme !== bIsReadme) {
          return aIsReadme ? -1 : 1
        }

        const indexComparison = compareIndex(a.index ?? -1, b.index ?? -1)
        if (indexComparison !== 0) {
          return indexComparison
        }
      }

      return a.title.localeCompare(b.title)
    })
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        sortTree(node.children)
      }
    }
  }
  // 7. Filter out ignored articles using centralized ignore logic
  function filterIgnoredNodes(nodes: TreeNode[], isRoot: boolean): TreeNode[] {
    const result: TreeNode[] = []
    for (const node of nodes) {
      // Check if this node should be ignored
      if (node.isFolder) {
        if (shouldIgnoreDirectory(node.title)) {
          continue
        }
      } else {
        if (shouldIgnoreFile(node.title, isRoot)) {
          continue
        }
      }

      // Recursively filter children
      if (node.children && node.children.length > 0) {
        node.children = filterIgnoredNodes(node.children, false)
      }

      if (node.isFolder && isAppendixDirectoryName(node.title)) {
        const promotedChildren = node.children.filter(
          (child) => child.isFolder || !isReadmeArticle(child)
        )
        const promotedParentId = node.parentId

        for (const child of promotedChildren) {
          child.parentId = promotedParentId
        }

        result.push(...promotedChildren)
        continue
      }

      result.push(node)
    }
    return result
  }

  const filteredTree = filterIgnoredNodes(mergedTree, true)

  function injectReadmeIntroNodes(nodes: TreeNode[]) {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        injectReadmeIntroNodes(node.children)
      }

      const introTitle = node.introTitle?.trim() ?? ""
      if (!node.isFolder || node.isPreface || introTitle === "") {
        continue
      }

      const hasInjectedIntro = node.children.some(
        (child) => child.isReadmeIntro
      )
      if (hasInjectedIntro) {
        continue
      }

      node.children.push({
        id: `${node.slug}/readme-intro`,
        title: introTitle,
        slug: node.slug,
        index: -1,
        isFolder: false,
        isAppendix: false,
        isPreface: false,
        isAdvanced: false,
        isReadmeIntro: true,
        parentId: node.id,
        children: [],
      })
    }
  }

  injectReadmeIntroNodes(filteredTree)
  sortTree(filteredTree)

  return filteredTree
}
