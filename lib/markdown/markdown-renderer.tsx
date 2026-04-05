import ReactMarkdown from "react-markdown"
import type { RehypeShikiPlugin } from "@/lib/markdown/plugins/rehype-shiki"
import { getMarkdownComponents } from "@/lib/markdown/components"
import { getPluginsForContent } from "@/lib/markdown/processor"

interface MarkdownRendererProps {
  content: string
  rawPath?: string
  shikiPlugin?: RehypeShikiPlugin
}

export function MarkdownRenderer({
  content,
  rawPath = "",
  shikiPlugin,
}: MarkdownRendererProps) {
  const { remarkPlugins, rehypePlugins } = getPluginsForContent(
    content,
    shikiPlugin
  )

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={getMarkdownComponents(rawPath)}>
      {content}
    </ReactMarkdown>
  )
}
