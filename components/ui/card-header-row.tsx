import { cn } from "@/lib/cn"
import React from "react"

interface CardHeaderRowProps {
  badge: React.ReactNode
  date: string | React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function CardHeaderRow({
  badge,
  date,
  actions,
  className,
}: CardHeaderRowProps) {
  return (
    <div className={cn("card-header-row", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {badge}
          <span className="mono-label">{date}</span>
        </div>
        {actions && (
          <div className="flex flex-col items-end gap-1">{actions}</div>
        )}
      </div>
    </div>
  )
}
