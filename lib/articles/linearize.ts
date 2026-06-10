import fs from "fs"
import path from "path"

import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"
import type { ArticleLocale } from "@/lib/articles/manifest"
import { artifactFilename } from "@/lib/articles/content"
import { resolveLocalArticlePath } from "@/lib/articles/fs"

/**
 * A flattened, linearized article ready for PDF consumption.
 *
 * Each entry corresponds to one non-folder leaf in the article tree,
 * enriched with the chapter (section) metadata it belongs to.
 */
export interface LinearizedArticle {
  /** Canonical slug used to look up the article (e.g. "tree-farm/basics"). */
  slug: string
  /** Display title of the article. */
  title: string
  /**
   * Resolved file path relative to the articles submodule root.
   * `null` when `resolveSlug` cannot find a match — the caller should
   * skip or handle gracefully.
   */
  filePath: string | null
  /** Slug of the parent chapter (empty string for root-level articles like preface). */
  chapterSlug: string
  /** Display title of the parent chapter (empty string for root-level articles). */
  chapterTitle: string
  /** True when this node is flagged as preface content. */
  isPreface: boolean
  /** True when this node belongs to an appendix section. */
  isAppendix: boolean
  /** True when this node is marked as advanced content. */
  isAdvanced: boolean
  /** True when this node is a synthetic README intro of its parent folder. */
  isReadmeIntro: boolean
  /** Sort index from the manifest (-1 when unset). */
  index: number
  /** Nesting depth in the article tree (0 = root-level). */
  depth: number
}

/**
 * Flatten a sorted `ChapterNavNode[]` into a display-order array of
 * `LinearizedArticle` entries.
 *
 * The input tree is expected to already be sorted (e.g. the output of
 * `getPublicChapterNav()`).  The DFS traversal preserves that order so the
 * result is ready for serial PDF generation — iterate once and create
 * section/page breaks each time `chapterSlug` changes.
 *
 * Folder nodes become the "chapter" context for their descendants; they are
 * not emitted as articles themselves.
 */
export async function linearizeArticles(tree: ChapterNavNode[]): Promise<LinearizedArticle[]> {
  async function linearizeNodes(
    nodes: ChapterNavNode[],
    chapterSlug: string,
    chapterTitle: string,
    depth: number,
  ): Promise<LinearizedArticle[]> {
    const nested = await Promise.all(
      nodes.map(async (node): Promise<LinearizedArticle[]> => {
      if (node.isFolder) {
        // Descend into the folder, which becomes the active chapter
        return linearizeNodes(node.children, node.slug, node.title, depth + 1)
      }

      // Resolve file path; may be null if slug is missing from the manifest
      const filePath = await resolveLocalArticlePath(node.slug)

      return [
        {
          slug: node.slug,
          title: node.title,
          filePath,
          chapterSlug,
          chapterTitle,
          isPreface: node.isPreface ?? false,
          isAppendix: node.isAppendix ?? false,
          isAdvanced: node.isAdvanced ?? false,
          isReadmeIntro: node.isReadmeIntro ?? false,
          index: node.index ?? -1,
          depth,
        },
      ]
      })
    )

    return nested.flat()
  }

  return linearizeNodes(tree, /* chapterSlug */ "", /* chapterTitle */ "", /* depth */ 0)
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

/**
 * Read the raw markdown content of an article by slug.
 *
 * This is a convenience wrapper over `getArticleContent()` that accepts a
 * slug instead of a raw file path.
 *
 * @returns The article's markdown string, or `null` if the slug cannot be
 *          resolved or the file is missing.
 */
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
