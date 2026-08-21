import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/cn"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-mono font-bold uppercase tracking-widest transition-all duration-300 rounded-none outline-none focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2 overflow-hidden group border cursor-pointer disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "before:content-[''] before:bg-tech-signal before:absolute before:right-0 before:bottom-0 before:size-1.5 before:opacity-80 group-hover:before:bg-current bg-tech-main-dark border-tech-main-dark text-tech-bg hover:bg-tech-signal hover:border-tech-signal hover:text-tech-signal-ink",
        primary:
          "before:content-[''] before:bg-tech-signal before:absolute before:right-0 before:bottom-0 before:size-1.5 before:opacity-80 group-hover:before:bg-current bg-tech-main-dark border-tech-main-dark text-tech-bg hover:bg-tech-signal hover:border-tech-signal hover:text-tech-signal-ink",
        destructive:
          "before:content-[''] before:bg-tech-signal before:absolute before:right-0 before:bottom-0 before:size-1.5 before:opacity-80 group-hover:before:bg-current bg-red-500 border-red-500 text-white hover:bg-red-700",
        danger:
          "before:content-[''] before:bg-tech-signal before:absolute before:right-0 before:bottom-0 before:size-1.5 before:opacity-80 group-hover:before:bg-current bg-red-500 border-red-500 text-white hover:bg-red-700",
        outline:
          "before:content-[''] before:bg-tech-signal before:absolute before:right-0 before:bottom-0 before:size-1.5 before:opacity-80 group-hover:before:bg-current bg-background border-tech-main text-tech-main hover:bg-tech-accent/20 hover:text-tech-main-dark",
        secondary:
          "before:content-[''] before:bg-tech-signal before:absolute before:right-0 before:bottom-0 before:size-1.5 before:opacity-80 group-hover:before:bg-current bg-surface-overlay/80 border-tech-main text-tech-main hover:border-tech-main-dark hover:text-tech-main-dark hover:bg-tech-accent/20",
        ghost:
          "bg-transparent border-transparent text-tech-main hover:underline decoration-1 underline-offset-4",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-4 py-2.5 sm:px-6 sm:py-3 text-sm min-h-11 sm:min-h-auto",
        md: "px-4 py-2.5 sm:px-6 sm:py-3 text-sm min-h-11 sm:min-h-auto",
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

export { Button, buttonVariants }
