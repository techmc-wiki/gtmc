import * as React from "react"

import { cn } from "@/lib/cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 rounded-none border border-tech-main/30 bg-surface-input px-3 py-2.5 font-mono text-tech-main-dark outline-none transition-colors focus:border-tech-main placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-3 min-h-[88px] resize-y",
        "aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
