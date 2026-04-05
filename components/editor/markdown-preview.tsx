"use client"

import { MarkdownRenderer } from "@/lib/markdown"
import "katex/dist/katex.min.css"

interface MarkdownPreviewProps {
  content: string
  rawPath?: string
}

export function MarkdownPreview({ content, rawPath }: MarkdownPreviewProps) {
  return (
    <MarkdownRenderer content={content} rawPath={rawPath} />
  )
}
