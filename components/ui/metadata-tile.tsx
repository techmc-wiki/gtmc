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
      className={cn("border guide-line bg-tech-main/5 px-4 py-3", className)}>
      <p className="font-mono text-[0.625rem] tracking-widest text-tech-main/45 uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm tracking-widest text-tech-main uppercase">
        {value}
      </p>
    </div>
  )
}
