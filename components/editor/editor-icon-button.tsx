"use client"

import * as React from "react"
import { Button } from "@/components/ui/shadcn/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/shadcn/tooltip"
import { cn } from "@/lib/cn"

export function EditorIconButton({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={label}
          className={cn(
            "hover:bg-tech-main/8 size-11 shrink-0 border-0 p-0 hover:no-underline aria-pressed:bg-tech-main/10 [&_svg]:size-4",
            className
          )}
          {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
