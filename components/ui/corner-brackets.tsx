import React from "react"

interface CornerBracketsProps {
  className?: string
  /** Base corner size (Tailwind class). Default: "size-2" */
  size?: string
  /** Base corner color (Tailwind border class). Default: "border-tech-main/40" */
  color?: string
  /** Which corners to render. Default: "all" */
  corners?: "all" | "top-bottom" | "diagonal-tlbr" | "diagonal-trbl"
  /** Behavior variant. Default: "static" */
  variant?: "static" | "hover" | "hover-expand" | "hover-only"
  /** Hover scale factor for hover-expand variant. Default: 1.5 */
  hoverScale?: number
}

const sizeToPx: Record<string, number> = {
  "size-1": 4,
  "size-2": 8,
  "size-3": 12,
  "size-4": 16,
  "size-5": 20,
  "size-6": 24,
  "size-8": 32,
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
      hoverScale = 1.5,
    },
    ref
  ) => {
    const showTopLeft =
      corners === "all" ||
      corners === "top-bottom" ||
      corners === "diagonal-tlbr"
    const showTopRight = corners === "all" || corners === "diagonal-trbl"
    const showBottomLeft = corners === "all" || corners === "diagonal-trbl"
    const showBottomRight =
      corners === "all" ||
      corners === "top-bottom" ||
      corners === "diagonal-tlbr"

    const posTopLeft = "-translate-px border-t-2 border-l-2"
    const posTopRight = "translate-x-px -translate-y-px border-t-2 border-r-2"
    const posBottomLeft = "-translate-x-px translate-y-px border-b-2 border-l-2"
    const posBottomRight = "translate-px border-r-2 border-b-2"

    if (variant === "static") {
      return (
        <div ref={ref} className={className}>
          {showTopLeft && (
            <div
              className={`pointer-events-none absolute top-0 left-0 ${size} ${posTopLeft} ${color}`}
            />
          )}
          {showTopRight && (
            <div
              className={`pointer-events-none absolute top-0 right-0 ${size} ${posTopRight} ${color}`}
            />
          )}
          {showBottomLeft && (
            <div
              className={`pointer-events-none absolute bottom-0 left-0 ${size} ${posBottomLeft} ${color}`}
            />
          )}
          {showBottomRight && (
            <div
              className={`pointer-events-none absolute right-0 bottom-0 ${size} ${posBottomRight} ${color}`}
            />
          )}
        </div>
      )
    }

    if (variant === "hover") {
      return (
        <div ref={ref} className={className}>
          {showTopLeft && (
            <div
              className={`absolute top-0 left-0 ${size} ${posTopLeft} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {showTopRight && (
            <div
              className={`absolute top-0 right-0 ${size} ${posTopRight} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {showBottomLeft && (
            <div
              className={`absolute bottom-0 left-0 ${size} ${posBottomLeft} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {showBottomRight && (
            <div
              className={`absolute right-0 bottom-0 ${size} ${posBottomRight} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
        </div>
      )
    }

    if (variant === "hover-only") {
      return (
        <div ref={ref} className={className}>
          {showTopLeft && (
            <div
              className={`pointer-events-none absolute top-0 left-0 ${size} ${posTopLeft} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {showTopRight && (
            <div
              className={`pointer-events-none absolute top-0 right-0 ${size} ${posTopRight} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {showBottomLeft && (
            <div
              className={`pointer-events-none absolute bottom-0 left-0 ${size} ${posBottomLeft} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {showBottomRight && (
            <div
              className={`pointer-events-none absolute right-0 bottom-0 ${size} ${posBottomRight} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
        </div>
      )
    }

    const basePx = sizeToPx[size] ?? 8
    const bracketStyle = {
      width: "var(--bracket-size)",
      height: "var(--bracket-size)",
      "--bracket-size": `${basePx}px`,
    } as React.CSSProperties

    return (
      <div
        ref={ref}
        className={className}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.setProperty(
            "--bracket-size",
            `${basePx * hoverScale}px`
          )
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.setProperty(
            "--bracket-size",
            `${basePx}px`
          )
        }}>
        {showTopLeft && (
          <div
            className={`pointer-events-none absolute top-0 left-0 ${posTopLeft} ${color} transition-all`}
            style={bracketStyle}
          />
        )}
        {showTopRight && (
          <div
            className={`pointer-events-none absolute top-0 right-0 ${posTopRight} ${color} transition-all`}
            style={bracketStyle}
          />
        )}
        {showBottomLeft && (
          <div
            className={`pointer-events-none absolute bottom-0 left-0 ${posBottomLeft} ${color} transition-all`}
            style={bracketStyle}
          />
        )}
        {showBottomRight && (
          <div
            className={`pointer-events-none absolute right-0 bottom-0 ${posBottomRight} ${color} transition-all`}
            style={bracketStyle}
          />
        )}
      </div>
    )
  }
)

CornerBrackets.displayName = "CornerBrackets"
