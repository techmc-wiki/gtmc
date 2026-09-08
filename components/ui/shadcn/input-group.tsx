"use client"

// Vendored from Coss UI input-group (coss.com/ui), using the shared Input.
// The group owns the border and focus treatment.
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { Input } from "@/components/ui/shadcn/input"
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
        "text-tech-main/60 flex items-center gap-2 truncate text-xs select-none",
        className
      )}
      {...props}
    />
  )
}

/** Shares Input typography, validation, and disabled states; the group owns the frame. */
export function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">): React.ReactElement {
  return (
    <Input
      type="text"
      className={cn(
        "h-full min-h-0 flex-1 border-0 bg-transparent px-1 py-2 sm:px-1 sm:py-2",
        className
      )}
      {...props}
    />
  )
}
