"use client"

import * as React from "react"
import { TabsContent } from "@/components/ui/shadcn/tabs"
import { ResizablePanelGroup } from "@/components/ui/shadcn/resizable"
import { useDefaultLayout } from "react-resizable-panels"

interface EditorSurfaceProps {
  children: React.ReactNode
  className?: string
  as?: "div" | "form"
  onSubmit?: React.FormEventHandler<HTMLFormElement>
}

/** Editor page frame: bordered paper surface, optionally grid-paper or a `<form>`. */
export function EditorSurface({
  children,
  className = "",
  as = "div",
  onSubmit,
  ...props
}: EditorSurfaceProps) {
  const classes = `flex w-full flex-col space-y-6 border border-tech-main/40 bg-surface-overlay/80 p-4 backdrop-blur-sm sm:p-6 ${className}`

  if (as === "form") {
    return (
      <form onSubmit={onSubmit} className={classes} {...props}>
        {children}
      </form>
    )
  }

  return <div className={classes}>{children}</div>
}

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

interface EditorPreviewPanelProps {
  children: React.ReactNode
  className?: string
  /** TabsContent value matching the tab trigger. */
  value: string
}

export function EditorPreviewPanel({
  children,
  className = "",
  value,
}: EditorPreviewPanelProps) {
  return (
    <TabsContent
      value={value}
      forceMount
      className={`editor-grow data-[state=inactive]:hidden md:data-[state=inactive]:flex ${className} `}>
      {children}
    </TabsContent>
  )
}

interface EditorWritePanelProps {
  children: React.ReactNode
  className?: string
  /** TabsContent value matching the tab trigger. */
  value: string
}

export function EditorWritePanel({
  children,
  className = "",
  value,
}: EditorWritePanelProps) {
  return (
    <TabsContent
      value={value}
      forceMount
      className={`editor-grow data-[state=inactive]:hidden md:data-[state=inactive]:flex ${className} `}>
      <div className="editor-surface">{children}</div>
    </TabsContent>
  )
}

interface EditorSplitLayoutProps {
  children: React.ReactNode
}

/** Side-by-side write/preview layout with a persisted divider. */
export function EditorSplitLayout({ children }: EditorSplitLayoutProps) {
  const defaultLayout = useDefaultLayout({
    id: "gtmc:editor-layout",
    storage: typeof window === "undefined" ? undefined : window.localStorage,
  })

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      defaultLayout={defaultLayout.defaultLayout}
      onLayoutChanged={defaultLayout.onLayoutChanged}
      className="editor-grow flex-col md:flex-row">
      {children}
    </ResizablePanelGroup>
  )
}

interface EditorContentAreaProps {
  children: React.ReactNode
  className?: string
}

/** Tab-content region below the toolbar, fills the remaining editor height. */
export function EditorContentArea({
  children,
  className = "",
}: EditorContentAreaProps) {
  return (
    <div
      className={`editor-grow border-tech-main/40 bg-surface-overlay/80 relative flex min-h-125 grow flex-col border backdrop-blur-sm ${className} `}>
      {children}
    </div>
  )
}
