"use client"

import ReactMarkdown from "react-markdown"
import { getMarkdownComponents, getPluginsForContent } from "@/lib/markdown"
import "katex/dist/katex.min.css"

interface MarkdownPreviewProps {
  content: string
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const plugins = getPluginsForContent(content)

  return (
    <ReactMarkdown
      remarkPlugins={plugins.remarkPlugins}
      rehypePlugins={plugins.rehypePlugins}
      components={getMarkdownComponents("")}>
      {content}
    </ReactMarkdown>
  )
}
