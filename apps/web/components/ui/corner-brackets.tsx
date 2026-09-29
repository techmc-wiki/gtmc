import * as React from "react"
import { cn } from "@/lib/cn"

export interface CornerBracketsProps {
  className?: string
  /** Tailwind sizing class. */
  size?: string
  /** Tailwind border-color class. */
  color?: string
  corners?: "all" | "top-bottom" | "diagonal-tlbr" | "diagonal-trbl"
  variant?: "static" | "hover" | "hover-only"
  ref?: React.Ref<HTMLDivElement>
}

const cornerPositionClasses = {
  topLeft: "-translate-px border-t-2 border-l-2",
  topRight: "translate-x-px -translate-y-px border-t-2 border-r-2",
  bottomLeft: "-translate-x-px translate-y-px border-b-2 border-l-2",
  bottomRight: "translate-px border-r-2 border-b-2",
} as const

function getCornerVisibility(
  corners: NonNullable<CornerBracketsProps["corners"]>
) {
  return {
    topLeft:
      corners === "all" ||
      corners === "top-bottom" ||
      corners === "diagonal-tlbr",
    topRight: corners === "all" || corners === "diagonal-trbl",
    bottomLeft: corners === "all" || corners === "diagonal-trbl",
    bottomRight:
      corners === "all" ||
      corners === "top-bottom" ||
      corners === "diagonal-tlbr",
  }
}

const hoverClasses = "opacity-0 transition-opacity group-hover:opacity-100"

/**
 * Hover variants require an ancestor group; hover-only corners remain
 * pointer-transparent.
 */
export function CornerBrackets({
  className,
  size = "size-2",
  color = "border-tech-main/40",
  corners = "all",
  variant = "static",
  ref,
}: CornerBracketsProps) {
  const visibility = getCornerVisibility(corners)
  const pointerEvents =
    variant === "hover" ? "pointer-events-auto" : "pointer-events-none"
  const cornerClass = `absolute ${size} ${color} ${pointerEvents} ${
    variant === "static" ? "" : hoverClasses
  }`

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}>
      {visibility.topLeft && (
        <div
          className={`top-0 left-0 ${cornerPositionClasses.topLeft} ${cornerClass}`}
        />
      )}
      {visibility.topRight && (
        <div
          className={`top-0 right-0 ${cornerPositionClasses.topRight} ${cornerClass}`}
        />
      )}
      {visibility.bottomLeft && (
        <div
          className={`bottom-0 left-0 ${cornerPositionClasses.bottomLeft} ${cornerClass}`}
        />
      )}
      {visibility.bottomRight && (
        <div
          className={`right-0 bottom-0 ${cornerPositionClasses.bottomRight} ${cornerClass}`}
        />
      )}
    </div>
  )
}
