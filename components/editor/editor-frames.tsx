"use client"

import * as React from "react"

interface EditorPreviewFrameProps {
  children: React.ReactNode
  className?: string
  emptyState?: React.ReactNode
  isEmpty?: boolean
}

/** Rendered markdown frame with an empty-state fallback. */
export function EditorPreviewFrame({
  children,
  className = "",
  emptyState,
  isEmpty = false,
}: EditorPreviewFrameProps) {
  if (isEmpty) {
    return (
      <p className="text-tech-main/60 p-6 text-sm sm:p-8">
        {emptyState || "Nothing to preview yet."}
      </p>
    )
  }

  return (
    <div
      className={`selection:bg-tech-main/20 selection:text-tech-main-dark w-full max-w-none overflow-hidden p-6 wrap-break-word sm:p-8 ${className}`}>
      {children}
    </div>
  )
}
