"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

interface EditorPreviewFrameProps {
  children: React.ReactNode
  className?: string
  emptyState?: React.ReactNode
  isEmpty?: boolean
}

export function EditorPreviewFrame({
  children,
  className = "",
  emptyState,
  isEmpty = false,
}: EditorPreviewFrameProps) {
  const t = useTranslations("Editor")

  if (isEmpty) {
    return (
      <p className="editor-panel">
        {emptyState || t("nothingToPreview") || "NOTHING_TO_PREVIEW_"}
      </p>
    )
  }

  return (
    <div
      className={`selection:bg-tech-main/20 w-full max-w-none overflow-hidden p-6 wrap-break-word selection:text-slate-900 sm:p-8 ${className} `}>
      {children}
    </div>
  )
}

interface EditorPreviewPanelProps {
  children: React.ReactNode
  className?: string
  id?: string
  hidden?: boolean
}

export function EditorPreviewPanel({
  children,
  className = "",
  id,
  hidden,
}: EditorPreviewPanelProps) {
  return (
    <div
      id={id}
      role="tabpanel"
      hidden={hidden}
      className={`editor-grow ${className} `}>
      {children}
    </div>
  )
}

interface EditorWritePanelProps {
  children: React.ReactNode
  className?: string
  id?: string
  hidden?: boolean
}

export function EditorWritePanel({
  children,
  className = "",
  id,
  hidden,
}: EditorWritePanelProps) {
  return (
    <div
      id={id}
      role="tabpanel"
      hidden={hidden}
      className={`editor-grow ${className} `}>
      <div className="editor-surface">{children}</div>
    </div>
  )
}

interface EditorContentAreaProps {
  children: React.ReactNode
  className?: string
}

export function EditorContentArea({
  children,
  className = "",
}: EditorContentAreaProps) {
  return (
    <div
      className={`editor-grow border-tech-main/40 relative flex min-h-125 grow flex-col border bg-white/80 backdrop-blur-sm ${className} `}>
      {children}
    </div>
  )
}
