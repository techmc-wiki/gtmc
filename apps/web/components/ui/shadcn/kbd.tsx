import * as React from "react"

import { cn } from "@/lib/cn"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "font-mono inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border border-tech-main/20 px-1 text-xs leading-none text-tech-main/70 whitespace-nowrap select-none [&>svg]:pointer-events-none [&>svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kbd-group"
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        className
      )}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
