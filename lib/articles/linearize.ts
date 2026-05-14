import type { TreeNode } from "@/types/sidebar-tree"
import { resolveSlug } from "@/lib/slug-resolver"
import { getArticleContent } from "@/lib/article-loader"

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
}

/**
 * Flatten a sorted `TreeNode[]` into a display-order array of
 * `LinearizedArticle` entries.
 *
 * The input tree is expected to already be sorted (e.g. the output of
 * `getPublicSidebarTree()`).  The DFS traversal preserves that order so the
 * result is ready for serial PDF generation — iterate once and create
 * section/page breaks each time `chapterSlug` changes.
 *
 * Folder nodes become the "chapter" context for their descendants; they are
 * not emitted as articles themselves.
 */
export function linearizeArticles(tree: TreeNode[]): LinearizedArticle[] {
  const result: LinearizedArticle[] = []

  function dfs(
    nodes: TreeNode[],
    chapterSlug: string,
    chapterTitle: string,
  ): void {
    for (const node of nodes) {
      if (node.isFolder) {
        // Descend into the folder, which becomes the active chapter
        dfs(node.children, node.slug, node.title)
      } else {
        // Resolve file path; may be null if slug is missing from the manifest
        const filePath = resolveSlug(node.slug)

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
        })
      }
    }
  }

  dfs(tree, /* chapterSlug */ "", /* chapterTitle */ "")

  return result
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
): Promise<string | null> {
  const filePath = resolveSlug(slug)
  if (!filePath) {
    return null
  }

  return getArticleContent(filePath)
}
