import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"
import type { ArticleLocale } from "@/lib/articles/manifest"
import { getArticleContentBySlug } from "@/lib/articles/content"
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
  const result: LinearizedArticle[] = []

  async function dfs(
    nodes: ChapterNavNode[],
    chapterSlug: string,
    chapterTitle: string,
    depth: number,
  ): Promise<void> {
    for (const node of nodes) {
      if (node.isFolder) {
        // Descend into the folder, which becomes the active chapter
        await dfs(node.children, node.slug, node.title, depth + 1)
      } else {
        // Resolve file path; may be null if slug is missing from the manifest
        const filePath = await resolveLocalArticlePath(node.slug)

        result.push({
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
        })
      }
    }
  }

  await dfs(tree, /* chapterSlug */ "", /* chapterTitle */ "", /* depth */ 0)

  return result
}

const contentCache = new Map<string, string | null>()

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

  const artifact = await getArticleContentBySlug(slug, locale)
  const content = artifact?.content ?? null
  
  contentCache.set(cacheKey, content)
  return content
}
