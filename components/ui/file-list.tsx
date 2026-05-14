"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

export function getFileLabel(filePath: string, index: number): string {
  const segments = filePath.split("/").filter(Boolean)
  return segments[segments.length - 1] || `UNTITLED_FILE_${index + 1}`
}

export function getFileExtension(filePath: string): string | null {
  if (!filePath.includes(".")) return null
  return filePath.slice(filePath.lastIndexOf("."))
}

interface FileListSidebarProps {
  children: React.ReactNode
  className?: string
  sticky?: boolean
}

export function FileListSidebar({
  children,
  className,
  sticky = false,
}: FileListSidebarProps) {
  return (
    <aside
      className={cn(
        "border-tech-main/30 flex flex-col border bg-white/40 shadow-[inset_0_0_40px_rgb(var(--color-tech-main)/0.05)] backdrop-blur-sm",
        sticky &&
          "sticky top-16 max-h-[calc(100dvh-4rem)] self-start overflow-y-auto md:top-20 md:max-h-[calc(100dvh-5rem)]",
        className
      )}>
      {children}
    </aside>
  )
}

interface FileListHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  count?: number
  actions?: React.ReactNode
  className?: string
}

export function FileListHeader({
  title,
  subtitle,
  count,
  actions,
  className,
}: FileListHeaderProps) {
  return (
    <div
      className={cn(
        "border-tech-main/30 bg-tech-main/3 flex items-center justify-between gap-3 border-b px-4 py-3",
        className
      )}>
      <div className="text-tech-main/80 flex min-w-0 flex-1 flex-col gap-1 pt-1">
        <div className="flex h-4 items-center justify-start gap-2">
          <span className="text-tech-main-dark font-mono text-xs font-bold tracking-widest whitespace-nowrap uppercase">
            {title}
          </span>
          {count !== undefined && (
            <span className="border-tech-main/30 bg-tech-main/10 rounded-sm border px-1 font-mono text-[9px]">
              {count}
            </span>
          )}
        </div>
        {subtitle && (
          <p
            className="text-tech-main/50 flex items-center gap-1 truncate font-mono text-[9px] tracking-wide uppercase"
            title={typeof subtitle === "string" ? subtitle : undefined}>
            <span className="bg-tech-main/30 size-1 rounded-full" />
            {subtitle}
          </p>
        )}
      </div>
      {actions}
    </div>
  )
}

interface FileListStatusBarProps {
  children: React.ReactNode
  variant?: "default" | "success" | "error" | "warning"
  className?: string
}

export function FileListStatusBar({
  children,
  variant = "default",
  className,
}: FileListStatusBarProps) {
  const variantStyles = {
    default: "border-tech-main/20 bg-tech-main/5 text-tech-main/70",
    success: "border-green-500/20 bg-green-500/5 text-green-700",
    error: "border-red-500/20 bg-red-500/5 text-red-600",
    warning: "border-amber-500/20 bg-amber-500/5 text-amber-700",
  }

  return (
    <div
      className={cn(
        "border-b px-4 py-2 font-mono text-[0.6875rem] tracking-widest uppercase",
        variantStyles[variant],
        className
      )}>
      {children}
    </div>
  )
}

interface FileListItemProps {
  fileId: string
  filePath: string
  index: number
  isActive: boolean
  onSelect: (fileId: string) => void
  primaryAction?: React.ReactNode
  secondaryAction?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function FileListItem({
  fileId,
  filePath,
  index,
  isActive,
  onSelect,
  primaryAction,
  secondaryAction,
  className,
  children,
}: FileListItemProps) {
  const fileLabel = getFileLabel(filePath, index)

  return (
    <div
      className={cn(
        "group relative ml-1 flex items-stretch border-l-2",
        isActive ? "border-tech-main" : "border-transparent",
        className
      )}>
      {!isActive && (
        <div className="bg-tech-main/20 absolute top-1/2 left-[-6px] h-px w-1.5" />
      )}
      {isActive && (
        <div className="bg-tech-main group-hover:animate-target-blink absolute inset-y-0 left-[-2px] w-0.5" />
      )}

      <button
        type="button"
        onClick={() => onSelect(fileId)}
        className={cn(
          "ml-1 flex min-h-[46px] min-w-0 flex-1 flex-col items-start gap-[2px] border px-3 py-2 text-left transition-all duration-200",
          isActive
            ? "border-tech-main bg-tech-main/8 z-10 scale-[1.01] shadow-[0_2px_10px_rgb(var(--color-tech-main)/0.08)]"
            : "hover:border-tech-main/30 hover:bg-tech-main/3 border-transparent bg-transparent"
        )}>
        <span className="flex w-full items-center justify-between">
          <span
            className={cn(
              "flex items-center gap-2 truncate font-mono tracking-widest uppercase transition-colors",
              isActive
                ? "text-tech-main text-xs font-bold"
                : "text-tech-main/70 text-[11px] font-medium"
            )}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={isActive ? "text-tech-main" : "text-tech-main/40"}>
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
            {fileLabel}
          </span>
          {primaryAction}
        </span>
        <span
          className={cn(
            "w-full truncate pl-5 font-mono text-[9px] transition-colors",
            isActive ? "text-tech-main/80" : "text-tech-main/40"
          )}>
          {filePath || "TARGET_PATH_NOT_SET"}
        </span>
        {children}
      </button>
      {secondaryAction}
    </div>
  )
}

interface FileExtBadgeProps {
  filePath: string
  className?: string
}

export function FileExtBadge({ filePath, className }: FileExtBadgeProps) {
  const ext = getFileExtension(filePath)
  if (!ext) return null

  return (
    <span
      className={cn(
        "kbd-badge bg-tech-main/5 text-tech-main/50 shrink-0 font-mono text-[0.5625rem] tracking-widest uppercase",
        className
      )}>
      {ext}
    </span>
  )
}

interface UnsavedIndicatorProps {
  className?: string
  title?: string
}

export function UnsavedIndicator({
  className,
  title = "UNSAVED_CHANGES",
}: UnsavedIndicatorProps) {
  return (
    <span
      className={cn(
        "size-[6px] shrink-0 animate-pulse border border-amber-900/10 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]",
        className
      )}
      title={title}
      aria-label={title}
    />
  )
}

interface FileListContainerProps {
  children: React.ReactNode
  className?: string
}

export function FileListContainer({
  children,
  className,
}: FileListContainerProps) {
  return (
    <div className={cn("flex-1 space-y-[2px] overflow-y-auto p-2", className)}>
      {children}
    </div>
  )
}
