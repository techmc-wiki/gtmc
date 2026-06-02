import type { PluggableList } from "unified"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkBreaks from "remark-breaks"
import rehypeRaw from "rehype-raw"
import rehypeKatex from "rehype-katex"
import rehypeSlug from "rehype-slug"

import { remarkAnsiColors } from "../syntax/remark-ansi-colors"
import { remarkCallouts } from "../syntax/remark-callouts"
import { remarkAdvancedSections } from "../syntax/remark-advanced-sections"
import { remarkPeopleMentions } from "../syntax/remark-people-mentions"
import { remarkNumberedHeadingsDot } from "../syntax/remark-heading-numbering"
import { remarkWikilinks } from "../syntax/remark-wikilinks"
import { rehypeAdvancedSections } from "../syntax/rehype-advanced-sections"
import { rehypeLinkedCode } from "../transforms/rehype-linked-code"
import { rehypeCJKSpacing } from "../transforms/rehype-cjk-spacing"
import type { RehypeShikiPlugin } from "../syntax/rehype-shiki"

/**
 * Options for building markdown plugin lists.
 */
export interface PipelineOptions {
  /** Include wikilink syntax support (default: false) */
  includeWikilinks?: boolean

  /** Include math/KaTeX support (auto-detected if not set) */
  includeMath?: boolean

  /** Include Shiki syntax highlighting */
  includeShiki?: boolean

  /** Shiki plugin instance (required if includeShiki is true) */
  shikiPlugin?: RehypeShikiPlugin
}

/**
 * Detect whether content contains math expressions that need KaTeX.
 */
function hasMathContent(content: string): boolean {
  return (
    content.includes("$") || content.includes("\\(") || content.includes("\\[")
  )
}

/**
 * Build the remark (markdown AST) plugin list.
 *
 * Shared between React renderer and PDF pipeline to eliminate duplication.
 */
export function buildRemarkPlugins(
  content: string,
  options: PipelineOptions = {}
): PluggableList {
  const plugins: PluggableList = [
    remarkGfm,
    remarkBreaks,
    remarkAnsiColors,
    remarkCallouts,
    remarkPeopleMentions,
    remarkAdvancedSections,
    [remarkNumberedHeadingsDot, { startDepth: 2 }],
  ]

  // Insert wikilinks early if requested
  if (options.includeWikilinks) {
    plugins.splice(3, 0, remarkWikilinks)
  }

  // Add math support if requested or auto-detected
  if (options.includeMath || hasMathContent(content)) {
    plugins.push(remarkMath)
  }

  return plugins
}

/**
 * Build the rehype (HTML AST) plugin list.
 *
 * Shared between React renderer and PDF pipeline to eliminate duplication.
 */
export function buildRehypePlugins(
  options: PipelineOptions = {}
): PluggableList {
  const plugins: PluggableList = [
    rehypeRaw,
    rehypeAdvancedSections,
    rehypeLinkedCode,
    rehypeSlug,
  ]

  // Add Shiki syntax highlighting if available
  if (options.includeShiki && options.shikiPlugin) {
    plugins.push(options.shikiPlugin)
  }

  // Add KaTeX for math rendering
  if (options.includeMath) {
    plugins.push(rehypeKatex)
  }

  // CJK spacing should run last (after all other transforms)
  plugins.push(rehypeCJKSpacing)

  return plugins
}

// Re-export transforms for direct access if needed
export { rehypeLinkedCode } from "../transforms/rehype-linked-code"
export { rehypeCJKSpacing } from "../transforms/rehype-cjk-spacing"
