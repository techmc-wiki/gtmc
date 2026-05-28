"use client"

import { MarkdownRenderer } from "@/lib/markdown"
// oxlint-disable-next-line import/no-unassigned-import
import "katex/dist/katex.min.css"

interface MarkdownPreviewProps {
  content: string
  rawPath?: string
}

export function MarkdownPreview({ content, rawPath }: MarkdownPreviewProps) {
  return <MarkdownRenderer content={content} rawPath={rawPath} />
}
