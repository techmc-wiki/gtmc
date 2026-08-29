import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/cn"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border px-2 py-0.5 font-mono text-xs tracking-wide whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-transparent text-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-red-500/40 bg-red-500/10 text-red-600 [a&]:hover:bg-red-500/20",
        outline: "border-border text-foreground",
        ghost: "border-transparent bg-transparent text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        pending: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700",
        "in-progress": "border-blue-500/40 bg-blue-500/10 text-blue-600",
        success: "border-green-500/40 bg-green-500/10 text-green-600",
        neutral: "border-tech-main/40 bg-tech-main/5 text-tech-main",
        signal: "border-tech-signal/40 bg-tech-signal/10 text-tech-signal",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge }
