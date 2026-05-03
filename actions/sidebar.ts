"use server"

import { getCurrentUserAuthContext, requireAdmin } from "@/lib/auth-context"
import { requireAuth } from "@/lib/auth-helpers"
import { createDirectFile, createPR } from "@/lib/github/pr-manager"
import { getPublicSidebarTree } from "@/lib/articles/public-tree"
import type { ArticleLocale } from "@/lib/article-loader"

export async function getSidebarTree(
  locale: ArticleLocale = "zh"
): ReturnType<typeof getPublicSidebarTree> {
  return getPublicSidebarTree(locale)
}

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

  let parentPath = ""
  if (parentId && parentId.startsWith("gh-")) {
    parentPath = parentId.replace(/^gh-/, "")
  }

  let finalSlug = slug
  if (parentPath) {
    if (!slug.includes("/")) {
      finalSlug = `${parentPath}/${slug}`
    } else if (!slug.startsWith(parentPath + "/")) {
      finalSlug = `${parentPath}/${slug}`
    }
  }
  finalSlug = finalSlug.replace(/^\/+/, "")

  const initialContent = isFolder ? "" : "# " + title
  const filePath = isFolder ? `${finalSlug}/.gitkeep` : `${finalSlug}.md`

  const authorName = session.user.name || "Unknown"
  const authorEmail = session.user.email || "unknown@gtmc.dev"
  const authContext = await getCurrentUserAuthContext(session.user.id)

  if (authContext.role === "ADMIN") {
    await requireAdmin(session.user.id)
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
}
