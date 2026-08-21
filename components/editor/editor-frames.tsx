"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { TabsContent } from "@/components/ui/shadcn/tabs"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/shadcn/resizable"
import { useDefaultLayout } from "react-resizable-panels"

interface EditorSurfaceProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "grid"
  as?: "div" | "form"
  onSubmit?: React.FormEventHandler<HTMLFormElement>
}

/** Editor page frame: bordered paper surface, optionally grid-paper or a `<form>`. */
export function EditorSurface({
  children,
  className = "",
  variant = "default",
  as = "div",
  onSubmit,
  ...props
}: EditorSurfaceProps) {
  const content = <div className="relative z-10">{children}</div>

  if (variant === "grid") {
    const gridClasses = `
      group relative flex w-full flex-col space-y-6 border border-tech-main/60
      bg-tech-bg p-4 shadow-[inset_0_0_100px_rgb(var(--color-tech-main)/0.03)]
      before:absolute before:inset-0 before:z-[-1] before:bg-[url('/bg-grid.svg')]
      before:bg-size-[24px_24px] before:opacity-[0.04]
      sm:p-6
      ${className}
    `

    const cornerTicks = (
      <>
        <div className="border-tech-main absolute -top-px -left-px size-3 border-t-2 border-l-2" />
        <div className="border-tech-main absolute -top-px -right-px size-3 border-t-2 border-r-2" />
        <div className="border-tech-main absolute -bottom-px -left-px size-3 border-b-2 border-l-2" />
        <div className="border-tech-main absolute -right-px -bottom-px size-3 border-r-2 border-b-2" />
      </>
    )

    return as === "form" ? (
      <form onSubmit={onSubmit} className={gridClasses} {...props}>
        {cornerTicks}
        {content}
      </form>
    ) : (
      <div className={gridClasses} {...props}>
        {cornerTicks}
        {content}
      </div>
    )
  }

  const defaultClasses = `
    group relative flex w-full flex-col space-y-6 border border-tech-main
    bg-surface-overlay/80 p-4 backdrop-blur-sm
    sm:p-6
    ${className}
  `

  if (as === "form") {
    return (
      <form onSubmit={onSubmit} className={defaultClasses} {...props}>
        {children}
      </form>
    )
  }

  return (
    <div className={defaultClasses} {...props}>
      {children}
    </div>
  )
}

interface EditorActionsProps {
  children: React.ReactNode
  className?: string
}

/** Right-aligned action row below an editor surface. */
export function EditorActions({
  children,
  className = "",
}: EditorActionsProps) {
  return (
    <div
      className={`border-tech-main/10 relative mt-6 flex justify-end gap-4 border-t pt-4 ${className} `}>
      <div className="corner-tick" />
      {children}
    </div>
  )
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
      className={`selection:bg-tech-main/20 selection:text-tech-main-dark w-full max-w-none overflow-hidden p-6 wrap-break-word sm:p-8 ${className} `}>
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
  /** Write panel element (rendered once by the caller). */
  write: React.ReactNode
  /** Preview panel element (rendered once by the caller). */
  preview: React.ReactNode
}

/**
 * Side-by-side write/preview on md+ with a draggable divider persisted to
 * localStorage (`gtmc:editor-layout`). Stacks vertically below md, where the
 * tab strip decides which panel is visible.
 */
export function EditorSplitLayout({ write, preview }: EditorSplitLayoutProps) {
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
      <ResizablePanel id="write" defaultSize="50" minSize="25" className="flex">
        {write}
      </ResizablePanel>
      <ResizableHandle className="bg-tech-main/20 hover:bg-tech-main/40 hidden w-px transition-colors md:flex" />
      <ResizablePanel
        id="preview"
        defaultSize="50"
        minSize="25"
        className="flex">
        {preview}
      </ResizablePanel>
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
