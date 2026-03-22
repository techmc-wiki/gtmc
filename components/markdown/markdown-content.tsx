"use client"

import ReactMarkdown from "react-markdown"

import {
  getMarkdownComponents,
  getPluginsForContent,
} from "@/app/(dashboard)/articles/markdown-helpers"

interface MarkdownContentProps {
  content: string
  rawPath?: string
  className?: string
}

export function MarkdownContent({
  content,
  rawPath = "",
  className,
}: MarkdownContentProps) {
  if (!content?.trim()) {
    return (
      <p className="p-6 font-mono text-xs text-tech-main/40">
        NOTHING_TO_PREVIEW_
      </p>
    )
  }

  const { remarkPlugins, rehypePlugins } =
    getPluginsForContent(content)
  const markdownComponents = getMarkdownComponents(rawPath)

  return (
    <div
      className={`
        prose prose-tech w-full max-w-none overflow-hidden wrap-break-word
        text-slate-800
        selection:bg-tech-main/20
        selection:text-slate-900${className ? `
          ${className}
        ` : ""}
      `}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
