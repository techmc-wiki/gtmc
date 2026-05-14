import { cn } from "@/lib/cn"
import React from "react"

interface MetadataTileProps {
  label: string
  value: React.ReactNode
  className?: string
}

export function MetadataTile({ label, value, className }: MetadataTileProps) {
  return (
    <div
      className={cn("guide-line bg-tech-main/5 border px-4 py-3", className)}>
      <p className="text-tech-main/45 font-mono text-[0.625rem] tracking-widest uppercase">
        {label}
      </p>
      <p className="text-tech-main mt-1 font-mono text-sm tracking-widest uppercase">
        {value}
      </p>
    </div>
  )
}
