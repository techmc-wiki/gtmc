import { getFirstArticleInChapter } from "@/lib/articles/navigation-data"
import {
  hasArticleLocale,
  type ArticleLocale,
} from "@/lib/articles/manifest"
import {
  getCachedArticleTree,
  getCachedLocalizedArticleEntry,
} from "@/lib/articles/manifest-cached"

import type { ArticleTreeNode as BaseArticleTreeNode } from "@/lib/github/sync"

export const SOURCE_ARTICLE_LOCALE: ArticleLocale = "zh"

export type ArticleTreeNode = BaseArticleTreeNode & { index?: number }

export interface ResolvedArticleTarget {
  filePath: string
  canonicalSlug: string
  index: number
  isPreface: boolean
  isReadmeIntro: boolean
  redirectToSlug?: string
}

export interface ResolvedArticleRequest {
  contentLocale: ArticleLocale
  target: ResolvedArticleTarget
  redirectToLocale?: ArticleLocale
}

/**
 * Resolves a UI locale to the article content locale it should serve.
 * Articles are authored in Chinese; every other locale falls back to it.
 */
export function resolveArticleLocale(locale: string): ArticleLocale {
  return locale === SOURCE_ARTICLE_LOCALE ? SOURCE_ARTICLE_LOCALE : "en"
}

export function getArticleFallbackLocale(locale: ArticleLocale): ArticleLocale {
  return locale === SOURCE_ARTICLE_LOCALE ? locale : SOURCE_ARTICLE_LOCALE
}

/**
 * Resolves an article slug path for a locale, falling back to the source
 * locale when the requested locale has no translation.
 */
export async function resolveArticleRequest(
  requestedSlugPath: string,
  locale: ArticleLocale
): Promise<ResolvedArticleRequest | null> {
  const localizedTarget = await resolveArticleTarget(requestedSlugPath, locale)
  if (localizedTarget) {
    return { contentLocale: locale, target: localizedTarget }
  }

  const fallbackLocale = getArticleFallbackLocale(locale)
  if (fallbackLocale === locale) {
    return null
  }

  const fallbackTarget = await resolveArticleTarget(
    requestedSlugPath,
    fallbackLocale
  )
  return fallbackTarget
    ? {
        contentLocale: fallbackLocale,
        target: fallbackTarget,
        redirectToLocale: fallbackLocale,
      }
    : null
}

async function resolveArticleTarget(
  requestedSlugPath: string,
  locale: ArticleLocale
): Promise<ResolvedArticleTarget | null> {
  const normalizedSlug = requestedSlugPath.replace(/\.md$/i, "")
  const tree: ArticleTreeNode[] = await getCachedArticleTree(locale)
  const targetNode = findNodeBySlug(tree, normalizedSlug)

  if (!targetNode) {
    return null
  }

  const canonicalSlug = targetNode.isFolder
    ? await resolveCanonicalSlugForFolder(targetNode, locale)
    : targetNode.slug

  if (!canonicalSlug) {
    return null
  }

  if (!hasArticleLocale(canonicalSlug, locale)) {
    return null
  }

  const slugEntry = await getCachedLocalizedArticleEntry(canonicalSlug, locale)
  const filePath = slugEntry?.filePath ?? null
  if (!filePath) {
    return null
  }

  const redirectToSlug =
    targetNode.isFolder && canonicalSlug !== normalizedSlug
      ? canonicalSlug
      : undefined

  return {
    filePath,
    canonicalSlug,
    index: slugEntry?.index ?? -1,
    isPreface: slugEntry?.isPreface ?? false,
    isReadmeIntro: Boolean(slugEntry?.isFolder && slugEntry?.hasIntro),
    redirectToSlug,
  }
}

async function resolveCanonicalSlugForFolder(
  targetNode: ArticleTreeNode,
  locale: ArticleLocale
): Promise<string | null> {
  const mapEntry = await getCachedLocalizedArticleEntry(targetNode.slug, locale)
  if (mapEntry?.hasIntro && hasArticleLocale(targetNode.slug, locale)) {
    return targetNode.slug
  }

  return resolveFirstArticleSlug(targetNode.children ?? [], locale)
}

function findNodeBySlug(
  nodes: ArticleTreeNode[],
  targetSlug: string
): ArticleTreeNode | null {
  for (const node of nodes) {
    if (node.slug === targetSlug) {
      return node
    }

    const nested = findNodeBySlug(node.children ?? [], targetSlug)
    if (nested) {
      return nested
    }
  }

  return null
}

async function resolveFirstArticleSlug(
  children: ArticleTreeNode[],
  locale: ArticleLocale
): Promise<string | null> {
  if (!children || children.length === 0) {
    return null
  }

  const chapterEntries = await Promise.all(
    children.map(async (child) => ({
      filePath:
        (await getCachedLocalizedArticleEntry(child.slug, locale))?.filePath ??
        `${child.slug}.md`,
      slug: child.slug,
      index: child.index ?? -1,
      isFolder: child.isFolder,
    }))
  )

  const firstEntry = getFirstArticleInChapter(chapterEntries)
  if (!firstEntry) {
    return null
  }

  if (!firstEntry.isFolder) {
    return hasArticleLocale(firstEntry.slug, locale) ? firstEntry.slug : null
  }

  const matchedFolder = children.find((child) => child.slug === firstEntry.slug)
  if (!matchedFolder) {
    return null
  }

  return resolveFirstArticleSlug(matchedFolder.children ?? [], locale)
}
