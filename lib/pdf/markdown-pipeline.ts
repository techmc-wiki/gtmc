/**
 * PDF-specific markdown processing pipeline.
 *
 * Produces pure HTML strings (no React) using unified/remark/rehype,
 * designed for Playwright-based PDF generation.
 *
 * Mirrors the plugin setup in lib/markdown/processor.ts but replaces
 * react-markdown with rehype-stringify for HTML output.
 */

import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkBreaks from "remark-breaks"
import remarkRehype from "remark-rehype"
import rehypeRaw from "rehype-raw"
import rehypeKatex from "rehype-katex"
import rehypeSlug from "rehype-slug"
import rehypeStringify from "rehype-stringify"
import matter from "gray-matter"
import type { PluggableList } from "unified"

import { remarkAnsiColors } from "@/lib/markdown/plugins/remark-ansi-colors"
import { remarkWikilinks } from "@/lib/markdown/plugins/remark-wikilinks"
import { remarkCallouts } from "@/lib/markdown/plugins/remark-callouts"
import { remarkAdvancedSections } from "@/lib/markdown/plugins/remark-advanced-sections"
import { remarkPeopleMentions } from "@/lib/markdown/plugins/remark-people-mentions"
import { remarkNumberedHeadingsDot } from "@/lib/markdown/plugins/remark-heading-numbering"
import { rehypeAdvancedSections } from "@/lib/markdown/plugins/rehype-advanced-sections"
import type { RehypeShikiPlugin } from "@/lib/markdown/plugins/rehype-shiki"

import { rehypeLinkedCode, rehypeCJKSpacing } from "@/lib/markdown/processor"

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
 * Detect whether the content contains math expressions that need KaTeX.
 */
function hasMathContent(content: string): boolean {
  return (
    content.includes("$") || content.includes("\\(") || content.includes("\\[")
  )
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

  // ── Build remark (markdown AST) plugin list ───────────────────────
  const remarkPlugins: PluggableList = [
    remarkGfm,
    remarkBreaks,
    remarkAnsiColors,
    remarkWikilinks,
    remarkCallouts,
    remarkPeopleMentions,
    remarkAdvancedSections,
    [remarkNumberedHeadingsDot, { startDepth: 2 }],
  ]

  // ── Build rehype (HTML AST) plugin list ───────────────────────────
  const rehypePlugins: PluggableList = [
    rehypeRaw,
    rehypeAdvancedSections,
    rehypeLinkedCode,
    rehypeSlug,
  ]

  // Conditionally include math support (KaTeX)
  if (hasMathContent(cleanContent)) {
    remarkPlugins.push(remarkMath)
    // Insert rehypeKatex after rehypeAdvancedSections (index 2)
    rehypePlugins.splice(2, 0, rehypeKatex)
  }

  // Conditionally include syntax highlighting
  if (options?.shikiPlugin) {
    rehypePlugins.push(options.shikiPlugin)
  }

  // Always apply CJK spacing last (after all transforms)
  rehypePlugins.push(rehypeCJKSpacing)

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
  html = html.replace(
    /<a\s+href="[^"]*"([^>]*class="[^"]*wikilink[^"]*"[^>]*)>(.*?)<\/a>/gi,
    '<span$1>$2</span>'
  )

  // ── Inject animated notice for GIF images ────────────────────────
  const baseUrl = options?.articleSlug
    ? `https://gtmc.wiki/en/articles/${options.articleSlug}`
    : ""
  const sourceLink = baseUrl
    ? ` <a href="${baseUrl}" class="gif-source-link">View original</a>`
    : ""
  html = html.replace(
    /(<img[^>]*src="(?!data:)[^"]*\.gif[^"]*"[^>]*\/?>)/gi,
    `$1<p class="gif-caption">▶ This figure is animated.${sourceLink}</p>`
  )

  return html
}
