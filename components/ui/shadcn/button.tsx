import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/cn"

const buttonVariants = cva(
  "inline-flex font-sans shrink-0 items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors rounded-none outline-none focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2 border disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-tech-main-dark border-tech-main-dark text-tech-bg hover:bg-tech-signal hover:border-tech-signal hover:text-tech-signal-ink",
        destructive: "bg-red-500 border-red-500 text-white hover:bg-red-700",
        outline:
          "bg-background border-input text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary/30 border-transparent text-secondary-foreground hover:bg-secondary/50",
        ghost:
          "bg-transparent border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-4 py-2.5 sm:px-6 sm:py-3 min-h-11 sm:min-h-auto",
        xs: "gap-1 px-2 py-1 text-xs",
        sm: "px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm",
        lg: "px-6 py-3 sm:px-8 sm:py-4 text-base min-h-11 sm:min-h-auto",
        icon: "size-11",
        "icon-xs": "size-6",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
