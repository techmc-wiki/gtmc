import ReactMarkdown from "react-markdown"
import type { ReactNode } from "react"

import type { RehypeShikiPlugin } from "@gtmc/ssg/markdown/syntax/rehype-shiki"
import type { CodeReference } from "@gtmc/ssg/markdown/code-provenance"
import { getMarkdownComponents } from "@/lib/markdown/components"
import {
  buildRehypePlugins,
  buildRemarkPlugins,
} from "@gtmc/ssg/markdown/pipeline/core"
import { rehypeCJKSpacingBrowser } from "@gtmc/ssg/markdown/transforms/rehype-cjk-spacing.browser"

interface MarkdownRendererProps {
  content: string
  locale?: string
  rawPath?: string
  shikiPlugin?: RehypeShikiPlugin
  codeReferences?: readonly CodeReference[]
  headingAction?: ReactNode
}

export function MarkdownRenderer({
  content,
  locale,
  rawPath = "",
  shikiPlugin,
  codeReferences,
  headingAction,
}: MarkdownRendererProps) {
  const remarkPlugins = buildRemarkPlugins()
  const rehypePlugins = buildRehypePlugins({
    shikiPlugin,
    codeReferences,
    cjkSpacingPlugin: rehypeCJKSpacingBrowser,
  })

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={getMarkdownComponents(
        rawPath,
        content,
        locale,
        headingAction
      )}>
      {content}
    </ReactMarkdown>
  )
}
