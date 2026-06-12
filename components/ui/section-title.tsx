import { cn } from "@/lib/cn"
import React from "react"

interface SectionTitleProps {
  children: React.ReactNode
  className?: string
}

export function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <h2
      className={cn(
        `display-title text-tech-main-dark border-tech-main/30 mb-6 flex items-baseline gap-3 border-b pb-2 text-xl tracking-tight md:text-2xl`,
        className
      )}>
      <span
        aria-hidden="true"
        className="bg-tech-signal inline-block size-2 shrink-0 self-center"
      />
      {children}
    </h2>
  )
}
