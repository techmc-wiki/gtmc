"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-helpers"
import { unstable_cache } from "next/cache"
import {
  getRepoContentTree,
  getRepoTranslations,
  createPR,
  createDirectFile,
  type RepoTreeNode,
} from "@/lib/github-pr"

interface TreeNode {
  id: string
  title: string
  slug: string
  isFolder: boolean
  parentId: string | null
  children: TreeNode[]
}

const getCachedRepoTree = unstable_cache(
  async () => {
    return getRepoContentTree()
  },
  ["github-repo-tree"],
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

  const itemMap = new Map<string, TreeNode>()
  const dbRootItems: TreeNode[] = []

  allItems.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] })
  })

  allItems.forEach((item) => {
    if (item.parentId) {
      const parent = itemMap.get(item.parentId)
      const child = itemMap.get(item.id)
      if (parent && child) {
        parent.children.push(child)
      } else if (child) {
        dbRootItems.push(child)
      }
    } else {
      const child = itemMap.get(item.id)
      if (child) dbRootItems.push(child)
    }
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

  // 4. Merge: GitHub tree first, then DB articles
  const mergedTree: TreeNode[] = [...(githubTree as TreeNode[]), ...dbRootItems]

  // 5. Apply translations to top-level titles
  mergedTree.forEach((node) => {
    if (translations[node.title]) {
      node.title = translations[node.title]
    }
  })

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
