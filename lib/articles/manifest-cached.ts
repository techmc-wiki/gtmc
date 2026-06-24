"use cache"

import { cacheLife, cacheTag } from "next/cache"
import {
  getArticleManifest,
  getArticleTree,
  getLocalizedArticleEntry,
  type ArticleEntry,
  type ArticleLocale,
  type LocalizedArticleMetadata,
} from "@/lib/articles/manifest"
import type { ArticleTreeNode } from "@/lib/github"

export async function getCachedArticleTree(
  locale: ArticleLocale = "zh"
): Promise<ArticleTreeNode[]> {
  cacheLife("hours")
  cacheTag("article-tree", `article-tree-${locale}`)

  return getArticleTree(locale)
}

export async function getCachedLocalizedArticleEntry(
  slugPath: string,
  locale: ArticleLocale = "zh"
): Promise<(ArticleEntry & LocalizedArticleMetadata) | null> {
  cacheLife("hours")
  cacheTag("article-manifest", `article-entry-${locale}-${slugPath}`)

  return getLocalizedArticleEntry(slugPath, locale)
}

export async function getCachedSlugForFilePath(
  filePath: string
): Promise<string | null> {
  cacheLife("hours")
  cacheTag("article-manifest")

  const normalizedFilePath = filePath.replace(/\.md$/i, "")
  for (const [slugKey, entry] of Object.entries(await getArticleManifest())) {
    if (entry.filePath.replace(/\.md$/i, "") === normalizedFilePath) {
      return slugKey
    }
  }

  return null
}
