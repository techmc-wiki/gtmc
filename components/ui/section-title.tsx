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
        `guide-line text-tech-main-dark mb-6 border-b pb-2 text-lg font-bold tracking-widest uppercase md:text-xl`,
        className
      )}>
      {children}
    </h2>
  )
}
