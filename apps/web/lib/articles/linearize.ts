import fs from "fs"
import path from "path"

import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"
import type { ArticleLocale } from "@/lib/articles/manifest"
import { artifactFilename } from "@/lib/articles/content"
import { resolveLocalArticlePath } from "@/lib/articles/fs"

export interface LinearizedFolder {
  slug: string
  title: string
}

export interface LinearizedArticle {
  slug: string
  title: string
  /** Path relative to the articles root, or `null` when the slug cannot be resolved. */
  filePath: string | null
  chapterSlug: string
  chapterTitle: string
  folders: LinearizedFolder[]
  isPreface: boolean
  isAppendix: boolean
  isAdvanced: boolean
  isReadmeIntro: boolean
  index: number
  depth: number
}

interface LinearizeContext {
  chapterSlug: string
  chapterTitle: string
  isAppendix: boolean
  folders: LinearizedFolder[]
  depth: number
}

/**
 * Returns article leaves in the tree's existing display order. Folder nodes only
 * supply chapter context and are not emitted as articles.
 */
export async function linearizeArticles(tree: ChapterNavNode[]): Promise<LinearizedArticle[]> {
  async function linearizeNodes(
    nodes: ChapterNavNode[],
    context: LinearizeContext
  ): Promise<LinearizedArticle[]> {
    const nested = await Promise.all(
      nodes.map(async (node): Promise<LinearizedArticle[]> => {
        const isAppendix = context.isAppendix || (node.isAppendix ?? false)

        if (node.isFolder) {
          if (node.isAppendix || context.depth === 0) {
            return linearizeNodes(node.children, {
              chapterSlug: node.slug,
              chapterTitle: node.title,
              isAppendix,
              folders: [],
              depth: context.depth + 1,
            })
          }
          return linearizeNodes(node.children, {
            ...context,
            isAppendix,
            folders: [
              ...context.folders,
              { slug: node.slug, title: node.title },
            ],
            depth: context.depth + 1,
          })
        }

        const filePath = await resolveLocalArticlePath(node.slug)
        const startsAppendix = node.isAppendix && !node.isReadmeIntro
        const chapterSlug = startsAppendix ? node.slug : context.chapterSlug
        const chapterTitle = startsAppendix ? node.title : context.chapterTitle

        return [
          {
            slug: node.slug,
            title: node.title,
            filePath,
            chapterSlug,
            chapterTitle,
            folders: context.folders,
            isPreface: node.isPreface ?? false,
            isAppendix,
            isAdvanced: node.isAdvanced ?? false,
            isReadmeIntro: node.isReadmeIntro ?? false,
            index: node.index ?? -1,
            depth: context.depth,
          },
        ]
      })
    )

    return nested.flat()
  }

  return linearizeNodes(tree, {
    chapterSlug: "",
    chapterTitle: "",
    isAppendix: false,
    folders: [],
    depth: 0,
  })
}

const contentCache = new Map<string, string | null>()

function loadArticleArtifactContent(
  slug: string,
  locale: ArticleLocale
): string | null {
  const filePath = path.join(
    process.cwd(),
    "data",
    "articles",
    locale,
    `${artifactFilename(slug)}.json`
  )

  try {
    const raw = fs.readFileSync(filePath, "utf-8")
    const artifact = JSON.parse(raw) as { content?: unknown }
    return typeof artifact.content === "string" ? artifact.content : null
  } catch {
    return null
  }
}

export async function getArticleContentForPdf(
  slug: string,
  locale: ArticleLocale,
): Promise<string | null> {
  const cacheKey = `${locale}:${slug}`
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey) ?? null
  }

  const content = loadArticleArtifactContent(slug, locale)

  contentCache.set(cacheKey, content)
  return content
}
