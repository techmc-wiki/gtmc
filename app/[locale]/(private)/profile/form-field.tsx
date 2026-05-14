import { cn } from "@/lib/cn"
import React from "react"

interface FormFieldProps {
  label: React.ReactNode
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  htmlFor,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn(`space-y-3 sm:space-y-4`, className)}>
      <label
        htmlFor={htmlFor}
        className="border-tech-main tracking-tech-wide text-tech-main-dark block border-l-2 pl-2.5 font-mono text-[0.625rem] font-bold uppercase sm:text-xs">
        {label}
      </label>
      {children}
    </div>
  )
}
