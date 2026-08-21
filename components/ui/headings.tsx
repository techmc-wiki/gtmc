import * as React from "react"
import { cn } from "@/lib/cn"

interface PageHeaderProps {
  title: string
  action?: React.ReactNode
  topMargin?: boolean
}

/**
 * Page-level title: large display serif over a heavy ink rule.
 */
export function PageHeader({
  title,
  action,
  topMargin = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "border-tech-main-dark relative border-b-2 pb-6",
        action &&
          "flex flex-col items-start justify-between gap-4 md:flex-row md:items-end",
        topMargin && "mt-8"
      )}>
      <div className={action ? "mb-0 w-full md:w-auto" : ""}>
        <h1 className="display-title text-tech-main-dark text-3xl tracking-tight text-balance md:text-5xl">
          {title}
        </h1>
      </div>
      {action && <div className="w-full md:w-auto">{action}</div>}
    </div>
  )
}

interface SectionTitleProps {
  children: React.ReactNode
  className?: string
}

/** Section-level title: display serif with a guide rule. */
export function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <h2
      className={cn(
        "display-title text-tech-main-dark border-tech-main/30 mb-6 border-b pb-2 text-xl tracking-tight md:text-2xl",
        className
      )}>
      {children}
    </h2>
  )
}
