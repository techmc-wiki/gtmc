"use client"

import * as React from "react"
import { CornerBrackets } from "@/components/ui/corner-brackets"

interface EditorSurfaceProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "grid"
  as?: "div" | "form"
  onSubmit?: React.FormEventHandler<HTMLFormElement>
}

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
      bg-[#fbfbfd] p-4 shadow-[inset_0_0_100px_rgb(var(--color-tech-main)/0.03)]
      before:absolute before:inset-0 before:z-[-1] before:bg-[url('/bg-grid.svg')]
      before:bg-size-[24px_24px] before:opacity-[0.04]
      sm:p-6
      ${className}
    `

    if (as === "form") {
      return (
        <form onSubmit={onSubmit} className={gridClasses} {...props}>
          <div className="absolute -top-px -left-px size-3 border-t-2 border-l-2 border-tech-main" />
          <div className="absolute -top-px -right-px size-3 border-t-2 border-r-2 border-tech-main" />
          <div className="absolute -bottom-px -left-px size-3 border-b-2 border-l-2 border-tech-main" />
          <div className="absolute -right-px -bottom-px size-3 border-r-2 border-b-2 border-tech-main" />
          {content}
        </form>
      )
    }

    return (
      <div className={gridClasses} {...props}>
        <div className="absolute -top-px -left-px size-3 border-t-2 border-l-2 border-tech-main" />
        <div className="absolute -top-px -right-px size-3 border-t-2 border-r-2 border-tech-main" />
        <div className="absolute -bottom-px -left-px size-3 border-b-2 border-l-2 border-tech-main" />
        <div className="absolute -right-px -bottom-px size-3 border-r-2 border-b-2 border-tech-main" />
        {content}
      </div>
    )
  }

  const defaultClasses = `
    group relative flex w-full flex-col space-y-6 border border-tech-main
    bg-white/80 p-4 backdrop-blur-sm
    sm:p-6
    ${className}
  `

  if (as === "form") {
    return (
      <form onSubmit={onSubmit} className={defaultClasses} {...props}>
        <CornerBrackets />
        {children}
      </form>
    )
  }

  return (
    <div className={defaultClasses} {...props}>
      <CornerBrackets />
      {children}
    </div>
  )
}

interface EditorFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
}

export function EditorForm({
  children,
  className = "",
  ...props
}: EditorFormProps) {
  return (
    <form
      {...props}
      className={`
        group relative flex w-full flex-col space-y-6 border border-tech-main
        bg-white/80 p-4 backdrop-blur-sm
        sm:p-6
        ${className}
      `}>
      <CornerBrackets />
      {children}
    </form>
  )
}

interface EditorPanelProps {
  children: React.ReactNode
  className?: string
}

export function EditorPanel({ children, className = "" }: EditorPanelProps) {
  return (
    <div
      className={`
        border border-tech-main/40 bg-white/80 p-4 backdrop-blur-sm
        ${className}
      `}>
      {children}
    </div>
  )
}

interface EditorActionsProps {
  children: React.ReactNode
  className?: string
}

export function EditorActions({
  children,
  className = "",
}: EditorActionsProps) {
  return (
    <div
      className={`
        relative mt-6 flex justify-end gap-4 border-t border-tech-main/10
        pt-4
        ${className}
      `}>
      <div className="corner-tick" />
      {children}
    </div>
  )
}
