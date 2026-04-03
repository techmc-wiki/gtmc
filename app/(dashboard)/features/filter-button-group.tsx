"use client"

import { cn } from "@/lib/cn"

interface FilterButtonGroupProps {
  options: { label: string; value: string }[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function FilterButtonGroup({
  options,
  value,
  onChange,
  className,
}: FilterButtonGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option: { label: string; value: string }) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex min-h-8 cursor-pointer items-center justify-center border px-3 py-2 font-mono text-xs transition-all uppercase",
            value === option.value
              ? "border-tech-main bg-tech-main text-white"
              : "border-tech-main/40 bg-transparent text-tech-main hover:border-tech-main/60"
          )}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
