import * as React from "react"
import { Card } from "@/components/ui/shadcn/card"
import { cn } from "@/lib/cn"

interface EmptyStateProps {
  message: string
  colSpanFull?: boolean
  className?: string
}

export function EmptyState({
  message,
  colSpanFull = false,
  className,
}: EmptyStateProps) {
  return (
    <Card
      tone="main"
      borderOpacity="muted"
      background="ghost"
      padding="spacious"
      hover="none"
      brackets="hidden"
      className={cn(
        "relative border-dashed py-16 text-center",
        colSpanFull && "col-span-full",
        className
      )}>
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,color-mix(in_oklab,var(--color-tech-main)_5%,transparent)_10px,color-mix(in_oklab,var(--color-tech-main)_5%,transparent)_20px)]" />
      <h2 className="text-tech-main/50 relative z-10 font-mono text-lg tracking-widest uppercase">
        {message}
      </h2>
    </Card>
  )
}
