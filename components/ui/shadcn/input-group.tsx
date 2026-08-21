"use client"

// Vendored from Coss UI input-group (coss.com/ui), adapted for GTMC:
// - square geometry + tech-* tokens (no radii, no shadows)
// - inner input/textarea render bare (the group owns the border), so no
//   dependency on Coss's `unstyled` input variant
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { cn } from "@/lib/cn"

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text select-none items-center justify-center gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      align: "inline-start",
    },
    variants: {
      align: {
        "block-end":
          "order-last w-full justify-start px-3 pb-2.5 [.border-t]:pt-2.5",
        "block-start":
          "order-first w-full justify-start px-3 pt-2.5 [.border-b]:pb-2.5",
        "inline-end":
          "order-last pr-3 has-[>button]:-me-1 has-[>kbd:last-child]:me-[-0.35rem]",
        "inline-start":
          "order-first pl-3 has-[>button]:-ms-1 has-[>kbd:last-child]:ms-[-0.35rem]",
      },
    },
  }
)

export function InputGroup({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "border-tech-main/30 bg-surface-input relative inline-flex min-h-[44px] w-full min-w-0 items-center border text-tech-main-dark transition-colors has-[input:focus-visible,textarea:focus-visible]:border-tech-main has-data-[slot=input-group-addon][data-align=block-end]:flex-wrap",
        className
      )}
      data-slot="input-group"
      {...props}
    />
  )
}

export function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof inputGroupAddonVariants>): React.ReactElement {
  return (
    <div
      className={cn(inputGroupAddonVariants({ align }), className)}
      data-align={align}
      data-slot="input-group-addon"
      {...props}
    />
  )
}

export function InputGroupText({
  className,
  ...props
}: React.ComponentProps<"span">): React.ReactElement {
  return (
    <span
      className={cn(
        "text-tech-main/60 flex items-center gap-2 truncate font-mono text-xs select-none",
        className
      )}
      {...props}
    />
  )
}

/** Bare input: the surrounding InputGroup owns borders and focus styling. */
export function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">): React.ReactElement {
  return (
    <input
      type="text"
      className={cn(
        "text-tech-main-dark placeholder:text-tech-main/50 h-full min-w-0 flex-1 bg-transparent px-1 py-2 font-mono text-sm outline-none",
        className
      )}
      {...props}
    />
  )
}

/** Bare textarea: see {@link InputGroupInput}. */
export function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">): React.ReactElement {
  return (
    <textarea
      className={cn(
        "text-tech-main-dark placeholder:text-tech-main/50 field-sizing-content min-h-16 w-full flex-1 resize-none bg-transparent px-1 py-2 font-mono text-sm outline-none",
        className
      )}
      {...props}
    />
  )
}
