import * as React from "react"

export interface CornerBracketsProps {
  className?: string
  /** Base corner size (Tailwind class). Default: "size-2" */
  size?: string
  /** Base corner color (Tailwind border class). Default: "border-tech-main/40" */
  color?: string
  /** Which corners to render. Default: "all" */
  corners?: "all" | "top-bottom" | "diagonal-tlbr" | "diagonal-trbl"
  /** Behavior variant. Default: "static" */
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
 * Drafting-table corner brackets. Server-safe: `static` shows the frame,
 * `hover`/`hover-only` reveal it when an ancestor `group` is hovered (the
 * latter keeps the corners click-transparent).
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
  const pointerEvents = variant === "hover" ? "" : "pointer-events-none"
  const cornerClass = `absolute ${size} ${color} ${pointerEvents} ${
    variant === "static" ? "" : hoverClasses
  }`

  return (
    <div ref={ref} className={className}>
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
