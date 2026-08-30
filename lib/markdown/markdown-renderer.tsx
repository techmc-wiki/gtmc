import ReactMarkdown from "react-markdown"
import type { ReactNode } from "react"

import type { RehypeShikiPlugin } from "@/lib/markdown/syntax/rehype-shiki"
import type { CodeReference } from "@/lib/markdown/code-provenance"
import { getMarkdownComponents } from "@/lib/markdown/components"
import { getPluginsForContent } from "@/lib/markdown/pipeline/react"

interface MarkdownRendererProps {
  content: string
  locale?: string
  rawPath?: string
  shikiPlugin?: RehypeShikiPlugin
  codeReferences?: readonly CodeReference[]
  /** Optional control rendered at the right edge of the article H1. */
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
  const { remarkPlugins, rehypePlugins } = getPluginsForContent(
    content,
    shikiPlugin,
    codeReferences
  )

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
