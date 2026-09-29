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
      className={cn(
        "py-12 text-center sm:py-12",
        colSpanFull && "col-span-full",
        className
      )}>
      <h2 className="text-muted-foreground text-base">{message}</h2>
    </Card>
  )
}
