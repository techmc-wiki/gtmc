"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { unstable_cache } from "next/cache"
import { createDirectFile, createPR } from "@/lib/github/pr-manager"
import { getRepoTranslations, type ArticleTreeNode } from "@/lib/github/sync"
import { getArticleTree } from "@/lib/article-loader"
import { shouldIgnoreDirectory, shouldIgnoreFile } from "@/lib/article-ignore"
import type { TreeNode } from "@/types/sidebar-tree"
import { statSync } from "fs"
import { join } from "path"

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

function getSlugMapMtime(): string {
  const slugMapPath = join(process.cwd(), "lib", "slug-map.json")
  return statSync(slugMapPath).mtime.getTime().toString()
}

const getCachedArticleTree = unstable_cache(
  async () => {
    return getArticleTree()
  },
  ["github-repo-tree", getSlugMapMtime()],
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
 * 获取树状结构的目录树 (Sidebar)
 * Tree is built from the GitHub repository, merged with DB articles.
 */
export async function getSidebarTree(): Promise<TreeNode[]> {
  // 1. Get DB article entries (always fresh)
  const allItems = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      isFolder: true,
      parentId: true,
      updatedAt: true,
    },
    orderBy: [{ isFolder: "desc" }, { title: "asc" }],
  })

  // 2. Get GitHub repo tree (cached)
  let githubTree: ArticleTreeNode[] = []
  let translations: Record<string, string> = {}

  const githubTreePromise = getCachedArticleTree()
  const translationsPromise = getCachedTranslations()

  const [treeResult, translationsResult] = await Promise.allSettled([
    githubTreePromise,
    translationsPromise,
  ])

  if (treeResult.status === "fulfilled") {
    githubTree = treeResult.value
  } else {
    console.error("Failed to fetch GitHub repo tree:", treeResult.reason)
  }

  if (translationsResult.status === "fulfilled") {
    translations = translationsResult.value
  } else {
    console.error(
      "Failed to fetch sidebar translations:",
      translationsResult.reason
    )
  }

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

  // 4. Add DB articles, deduplicating by slug
  const dbItemsPending = [...allItems]

  // First pass: add missing nodes
  for (const dbItem of dbItemsPending) {
    const slugKey = dbItem.slug.toLowerCase()
    if (!unifiedMap.has(slugKey)) {
      const newNode: TreeNode = {
        id: dbItem.id, // Keep DB ID so the client can interact with it
        title: dbItem.title,
        slug: dbItem.slug,
        index: -1,
        isAppendix: false,
        isPreface: false,
        isAdvanced: false,
        isFolder: dbItem.isFolder, // Make sure it defaults to false if missing
        parentId: dbItem.parentId,
        children: [],
      }
      unifiedMap.set(slugKey, newNode)
    }
  }

  // Second pass: link DB-exclusive items into the tree structure
  for (const dbItem of dbItemsPending) {
    const slugKey = dbItem.slug.toLowerCase()
    const node = unifiedMap.get(slugKey)

    // If node ID matches the DB item ID, it is a DB-exclusive node we just added.
    if (node && node.id === dbItem.id) {
      const parts = node.slug.split("/")
      const parentSlug = parts.slice(0, -1).join("/").toLowerCase()

      if (parentSlug && unifiedMap.has(parentSlug)) {
        const parentNode = unifiedMap.get(parentSlug)
        if (parentNode) {
          parentNode.children.push(node)
        }
      } else {
        mergedTree.push(node)
      }
    }
  }

  // 5. Apply translations to top-level titles
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

/**
 * 新建文件或文件夹（DB 侧边栏条目）
 */
export async function createDocument({
  title,
  slug,
  isFolder = false,
  parentId = null,
}: {
  title: string
  slug: string
  isFolder?: boolean
  parentId?: string | null
}) {
  const session = await requireAuth("未授权，请先登录")

  // 1. Resolve parent directory path
  let parentPath = ""
  if (parentId) {
    if (parentId.startsWith("gh-")) {
      parentPath = parentId.replace(/^gh-/, "")
    } else {
      const parentDoc = await prisma.article.findUnique({
        where: { id: parentId },
        select: { slug: true },
      })
      if (parentDoc) {
        parentPath = parentDoc.slug
      }
    }
  }

  // Determine full path/slug
  let finalSlug = slug
  if (parentPath) {
    if (!slug.includes("/")) {
      finalSlug = `${parentPath}/${slug}`
    } else if (!slug.startsWith(parentPath + "/")) {
      finalSlug = `${parentPath}/${slug}`
    }
  }
  finalSlug = finalSlug.replace(/^\/+/, "")

  const existing = await prisma.article.findUnique({
    where: { slug: finalSlug },
  })
  if (existing) {
    throw new Error("该路径已存在")
  }

  const initialContent = isFolder ? "" : "# " + title
  const filePath = isFolder ? `${finalSlug}/.gitkeep` : `${finalSlug}.md`

  const authorName = session.user.name || "Unknown"
  const authorEmail = session.user.email || "unknown@gtmc.dev"

  // 2. Sync to GitHub
  try {
    if (session.user.role === "ADMIN") {
      await createDirectFile({
        title: isFolder ? `Create folder ${title}` : `Create file ${title}`,
        content: initialContent,
        filePath,
        authorName,
        authorEmail,
      })
    } else {
      await createPR({
        title: isFolder
          ? `[系统自动生成] Request to create folder ${title}`
          : `[系统自动生成] Request to create file ${title}`,
        content: initialContent,
        filePath,
        authorName,
        authorEmail,
      })
    }
  } catch (error) {
    console.error("Failed to sync to GitHub:", error)
  }

  // 3. Create local DB entry
  const newDoc = await prisma.article.create({
    data: {
      title,
      slug: finalSlug,
      content: initialContent,
      isFolder,
      parentId,
      authorId: session.user.id,
    },
  })

  return newDoc
}
