import { cn } from "@/lib/cn"
import { Label } from "@/components/ui/shadcn/label"
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
      <Label htmlFor={htmlFor} className="block">
        {label}
      </Label>
      {children}
    </div>
  )
}
