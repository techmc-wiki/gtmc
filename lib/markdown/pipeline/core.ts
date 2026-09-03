import type { PluggableList } from "unified"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkBreaks from "remark-breaks"
import remarkDirective from "remark-directive"
import rehypeRaw from "rehype-raw"
import rehypeKatex from "rehype-katex"
import rehypeSlug from "rehype-slug"

import { remarkDirectiveHandler } from "@/lib/markdown/syntax/remark-directive-handler"
import { remarkCallouts } from "../syntax/remark-callouts"
import { remarkCodeProvenance } from "../syntax/remark-code-provenance"
import { remarkPeopleMentions } from "../syntax/remark-people-mentions"
import { remarkNumberedHeadingsDot } from "../syntax/remark-heading-numbering"
import { remarkWikilinks } from "../syntax/remark-wikilinks"
import { rehypeAdvancedSections } from "../syntax/rehype-advanced-sections"
import { rehypeCodeProvenance } from "../syntax/rehype-code-provenance"
import { rehypeMermaid } from "../syntax/rehype-mermaid"
import { rehypeLinkedCode } from "../transforms/rehype-linked-code"
import type { CodeReference } from "../code-provenance"
import type { RehypeShikiPlugin } from "../syntax/rehype-shiki"

interface RemarkPipelineOptions {
  includeWikilinks?: boolean
}

interface RehypePipelineOptions {
  shikiPlugin?: RehypeShikiPlugin
  codeReferences?: readonly CodeReference[]
  cjkSpacingPlugin: PluggableList[number]
}

/**
 * Build the remark (markdown AST) plugin list.
 *
 * Shared between React renderer and PDF pipeline to eliminate duplication.
 */
export function buildRemarkPlugins(
  options: RemarkPipelineOptions = {}
): PluggableList {
  const plugins: PluggableList = [
    remarkGfm,
    remarkBreaks,
    remarkDirective,
    remarkDirectiveHandler,
    remarkCallouts,
    remarkCodeProvenance,
    remarkPeopleMentions,
    [remarkNumberedHeadingsDot, { startDepth: 2 }],
  ]

  if (options.includeWikilinks) {
    plugins.splice(2, 0, remarkWikilinks)
  }

  plugins.push(remarkMath)

  return plugins
}

/**
 * Build the rehype (HTML AST) plugin list.
 *
 * Shared between React renderer and PDF pipeline to eliminate duplication.
 */
export function buildRehypePlugins(
  options: RehypePipelineOptions
): PluggableList {
  const plugins: PluggableList = [
    rehypeRaw,
    [rehypeCodeProvenance, { references: options.codeReferences }],
    rehypeMermaid,
    rehypeAdvancedSections,
    rehypeLinkedCode,
    rehypeSlug,
  ]

  if (options.shikiPlugin) {
    plugins.push(options.shikiPlugin)
  }

  plugins.push(rehypeKatex)
  plugins.push(options.cjkSpacingPlugin)

  return plugins
}
