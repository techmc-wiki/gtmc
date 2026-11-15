import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"
import rehypeSlug from "rehype-slug"
import remarkBreaks from "remark-breaks"
import remarkCjkFriendly from "remark-cjk-friendly"
import remarkDirective from "remark-directive"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import type { PluggableList } from "unified"

import type { CodeReference } from "../code-provenance"
import { rehypeAdvancedSections } from "../syntax/rehype-advanced-sections"
import { rehypeCodeProvenance } from "../syntax/rehype-code-provenance"
import { rehypeMermaid } from "../syntax/rehype-mermaid"
import type { RehypeShikiPlugin } from "../syntax/rehype-shiki"
import { remarkCallouts } from "../syntax/remark-callouts"
import { remarkCodeProvenance } from "../syntax/remark-code-provenance"
import { remarkDirectiveHandler } from "../syntax/remark-directive-handler"
import { remarkNumberedHeadingsDot } from "../syntax/remark-heading-numbering"
import { remarkImageAlt } from "../syntax/remark-image-alt"
import { remarkPeopleMentions } from "../syntax/remark-people-mentions"
import { remarkWikilinks } from "../syntax/remark-wikilinks"
import { rehypeLinkedCode } from "../transforms/rehype-linked-code"

interface RemarkPipelineOptions {
  includeWikilinks?: boolean
}

interface RehypePipelineOptions {
  shikiPlugin?: RehypeShikiPlugin
  codeReferences?: readonly CodeReference[]
  cjkSpacingPlugin?: PluggableList[number]
  katex?: boolean
}

export function buildRemarkPlugins(options: RemarkPipelineOptions = {}): PluggableList {
  const plugins: PluggableList = [
    remarkGfm,
    // CommonMark flanking rules leave `_**中文**_` literal next to CJK text.
    remarkCjkFriendly,
    remarkBreaks,
    remarkDirective,
    remarkDirectiveHandler,
    remarkCallouts,
    remarkCodeProvenance,
    remarkPeopleMentions,
    remarkImageAlt,
    [remarkNumberedHeadingsDot, { startDepth: 2 }],
  ]

  if (options.includeWikilinks) {
    plugins.splice(2, 0, remarkWikilinks)
  }

  plugins.push(remarkMath)

  return plugins
}

export function buildRehypePlugins(options: RehypePipelineOptions): PluggableList {
  const plugins: PluggableList = [
    rehypeRaw,
    [rehypeCodeProvenance, { references: options.codeReferences }],
    rehypeMermaid,
    rehypeSlug,
    rehypeAdvancedSections,
    rehypeLinkedCode,
  ]

  if (options.shikiPlugin) {
    plugins.push(options.shikiPlugin)
  }

  if (options.katex ?? true) {
    plugins.push(rehypeKatex)
  }
  if (options.cjkSpacingPlugin) {
    plugins.push(options.cjkSpacingPlugin)
  }

  return plugins
}
