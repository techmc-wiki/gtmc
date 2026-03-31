import React from "react"

interface CornerBracketsProps {
  className?: string
  size?: string
  color?: string
  corners?: "all" | "top-bottom"
  variant?: "static" | "hover"
}

export const CornerBrackets = React.forwardRef<
  HTMLDivElement,
  CornerBracketsProps
>(
  (
    {
      className,
      size = "size-2",
      color = "border-tech-main/40",
      corners = "all",
      variant = "static",
    },
    ref
  ) => {
    if (variant === "hover") {
      return (
        <div ref={ref} className={className}>
          <div
            className={`absolute top-0 left-0 ${size} -translate-px border-t-2 border-l-2 ${color} opacity-0 transition-opacity group-hover:opacity-100`}
          />
          <div
            className={`absolute right-0 bottom-0 ${size} translate-px border-r-2 border-b-2 ${color} opacity-0 transition-opacity group-hover:opacity-100`}
          />
        </div>
      )
    }

    const showTopLeft = corners === "all" || corners === "top-bottom"
    const showTopRight = corners === "all"
    const showBottomLeft = corners === "all"
    const showBottomRight = corners === "all" || corners === "top-bottom"

    return (
      <div ref={ref} className={className}>
        {showTopLeft && (
          <div
            className={`pointer-events-none absolute top-0 left-0 ${size} -translate-px border-t-2 border-l-2 ${color}`}
          />
        )}
        {showTopRight && (
          <div
            className={`pointer-events-none absolute top-0 right-0 ${size} translate-x-px -translate-y-px border-t-2 border-r-2 ${color}`}
          />
        )}
        {showBottomLeft && (
          <div
            className={`pointer-events-none absolute bottom-0 left-0 ${size} -translate-x-px translate-y-px border-b-2 border-l-2 ${color}`}
          />
        )}
        {showBottomRight && (
          <div
            className={`pointer-events-none absolute right-0 bottom-0 ${size} translate-px border-r-2 border-b-2 ${color}`}
          />
        )}
      </div>
    )
  }
)

CornerBrackets.displayName = "CornerBrackets"
