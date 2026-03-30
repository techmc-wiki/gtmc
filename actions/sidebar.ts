"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { unstable_cache } from "next/cache"
import {
  getRepoTranslations,
  createPR,
  createDirectFile,
  type RepoTreeNode,
} from "@/lib/github-pr"
import { getArticleTree } from "@/lib/article-loader"
import { statSync } from "fs"
import { join } from "path"

interface TreeNode {
  id: string
  title: string
  slug: string
  isFolder: boolean
  parentId: string | null
  children: TreeNode[]
}

function getSlugMapMtime(): string {
  const slugMapPath = join(process.cwd(), "lib", "slug-map.json")
  return statSync(slugMapPath).mtime.getTime().toString()
}

const getCachedRepoTree = unstable_cache(
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
  let githubTree: RepoTreeNode[] = []
  let translations: Record<string, string> = {}

  const githubTreePromise = getCachedRepoTree()
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
  function addGithubNodes(nodes: RepoTreeNode[], parentArray: TreeNode[]) {
    for (const node of nodes) {
      const clone: TreeNode = {
        ...node,
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

  // 6. Sort mergedTree (folders first, then alphabetically)
  function sortTree(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFolder === b.isFolder) {
        return a.title.localeCompare(b.title)
      }
      return a.isFolder ? -1 : 1
    })
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        sortTree(node.children)
      }
    }
  }
  sortTree(mergedTree)

  return mergedTree
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
