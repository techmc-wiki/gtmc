/**
 * PDF-specific markdown processing pipeline.
 *
 * Produces pure HTML strings (no React) using unified/remark/rehype,
 * designed for Playwright-based PDF generation.
 *
 * Uses the shared plugin builders from lib/markdown/pipeline/core.ts
 * to stay in sync with the React renderer.
 */

import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"
import matter from "gray-matter"

import type { RehypeShikiPlugin } from "@/lib/markdown/syntax/rehype-shiki"
import {
  buildRemarkPlugins,
  buildRehypePlugins,
} from "@/lib/markdown/pipeline/core"

/**
 * Options for the PDF markdown pipeline.
 */
export interface PdfPipelineOptions {
  /**
   * Optional Shiki syntax highlighting plugin instance (created via
   * `createRehypeShiki` or `getCachedRehypeShiki`).
   */
  shikiPlugin?: RehypeShikiPlugin

  /**
   * Article path used for resolving relative image URLs in the PDF context.
   */
  articlePath?: string

  /**
   * Article slug used for generating source links (e.g. for GIF captions).
   */
  articleSlug?: string
}

/**
 * Render markdown content to a pure HTML string.
 *
 * Uses the same unified/remark/rehype plugin chain as the main markdown
 * renderer, but outputs HTML via rehype-stringify instead of React components.
 *
 * @param content - Raw markdown text
 * @param options - Optional pipeline configuration
 * @returns Promise resolving to an HTML string
 */
export async function renderMarkdownToHtml(
  content: string,
  options?: PdfPipelineOptions
): Promise<string> {
  // ── Strip YAML frontmatter ────────────────────────────────────
  const { content: cleanContent } = matter(content)

  // ── Build plugin lists using shared builders ──────────────────────
  const remarkPlugins = buildRemarkPlugins(cleanContent, {
    includeWikilinks: true,
    includeMath: true,
  })

  const rehypePlugins = buildRehypePlugins({
    includeShiki: !!options?.shikiPlugin,
    shikiPlugin: options?.shikiPlugin,
    includeMath: true,
  })

  // ── Assemble and run the pipeline ─────────────────────────────────
  const file = await unified()
    .use(remarkParse)
    .use(remarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypePlugins)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(cleanContent)

  let html = String(file)

  // ── Strip href from wikilinks (produces dead relative links in PDF) ──
  // Wikilinks generate: <a href="../slug" class="wikilink">text</a>
  // Convert to: <span class="wikilink">text</span>
  html = html.replaceAll(
    /<a\s+href="[^"]*"([^>]*class="[^"]*wikilink[^"]*"[^>]*)>(.*?)<\/a>/gi,
    "<span$1>$2</span>"
  )

  // ── Inject animated notice for GIF images ────────────────────────
  const baseUrl = options?.articleSlug
    ? `https://gtmc.wiki/en/articles/${options.articleSlug}`
    : ""
  const sourceLink = baseUrl
    ? ` <a href="${baseUrl}" class="gif-source-link">View original</a>`
    : ""
  html = html.replaceAll(
    /(<img[^>]*src="(?!data:)[^"]*\.gif[^"]*"[^>]*\/?>)/gi,
    `$1<p class="gif-caption">▶ This figure is animated.${sourceLink}</p>`
  )

  return html
}
