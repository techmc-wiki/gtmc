"use client"

import * as React from "react"

interface EditorToolbarShellProps {
  children: React.ReactNode
  className?: string
}

export function EditorToolbarShell({
  children,
  className = "",
}: EditorToolbarShellProps) {
  return (
    <div
      className={`
        sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b
        border-tech-main-dark bg-tech-main-dark p-2 px-2 font-mono
        text-white/70 shadow-[0_2px_10px_rgb(var(--color-tech-main-dark)/0.2)]
        before:pointer-events-none before:absolute before:inset-0 before:bg-[url('/bg-grid.svg')] before:bg-size-[24px_24px] before:opacity-[0.05]
        sm:gap-1 sm:px-4
        ${className}
      `}>
      <div className="absolute top-0 left-0 h-px w-full bg-linear-to-r from-transparent via-tech-accent/20 to-transparent" />
      {children}
    </div>
  )
}

interface EditorToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "small" | "upload"
  isActive?: boolean
}

export function EditorToolbarButton({
  children,
  className = "",
  variant = "default",
  isActive = false,
  disabled,
  ...props
}: EditorToolbarButtonProps) {
  const baseClasses = `
    relative flex items-center justify-center border border-transparent
    px-3 transition-all duration-200 select-none
  `

  const variantClasses =
    variant === "small"
      ? "hidden h-8 items-center justify-center py-1 text-[10px] tracking-widest uppercase sm:flex hover:border-tech-accent/40 hover:bg-tech-accent/10 hover:text-white hover:shadow-[0_0_10px_rgb(var(--color-tech-accent)/0.1)]"
      : variant === "upload"
        ? "h-11 min-w-11 flex-1 text-white/70 hover:border-white/20 hover:bg-tech-accent/20 sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5"
        : "h-8 min-w-[32px] text-[10px] tracking-widest uppercase sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5 hover:border-tech-accent/40 hover:bg-tech-accent/10 hover:text-white hover:shadow-[0_0_10px_rgb(var(--color-tech-accent)/0.1)]"

  const stateClasses = disabled
    ? "opacity-50 cursor-not-allowed"
    : "cursor-pointer"

  const activeClasses = isActive
    ? "border-tech-accent bg-tech-accent/20 text-white shadow-[0_0_8px_rgb(var(--color-tech-accent)/0.2)]"
    : ""

  return (
    <button
      {...props}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses}
        ${stateClasses}
        ${activeClasses}
        ${className}
      `}>
      {children}
    </button>
  )
}

interface EditorToolbarDividerProps {
  className?: string
}

export function EditorToolbarDivider({
  className = "",
}: EditorToolbarDividerProps) {
  return (
    <div
      className={`
        mx-1 h-4 w-px bg-white/10
        ${className}
      `}
    />
  )
}

interface EditorToolbarStatusProps {
  children: React.ReactNode
  className?: string
}

export function EditorToolbarStatus({
  children,
  className = "",
}: EditorToolbarStatusProps) {
  return (
    <span
      className={`
        ml-auto hidden items-center gap-2 text-[9px] tracking-widest text-tech-accent/40 uppercase
        sm:flex
        ${className}
      `}>
      <span className="size-1.5 animate-pulse rounded-full bg-tech-accent/40" />
      {children}
    </span>
  )
}

interface EditorMacroBarProps {
  children: React.ReactNode
  className?: string
}

export function EditorMacroBar({
  children,
  className = "",
}: EditorMacroBarProps) {
  return (
    <div
      className={`
        relative flex h-12 items-center gap-2 overflow-x-auto scroll-smooth border-b
        guide-line bg-tech-main/4 px-4 shadow-[inset_0_1px_4px_rgb(var(--color-tech-main)/0.05)]
        ${className}
      `}>
      <div className="absolute inset-y-0 left-0 w-1 bg-tech-main/30" />
      {children}
    </div>
  )
}

interface EditorMacroLabelProps {
  children: React.ReactNode
  className?: string
}

export function EditorMacroLabel({
  children,
  className = "",
}: EditorMacroLabelProps) {
  return (
    <span
      className={`
        mr-2 font-mono text-[9px] tracking-widest text-tech-main/50 uppercase opacity-70
        ${className}
      `}>
      {children}
    </span>
  )
}
