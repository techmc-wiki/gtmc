import React from "react"
import { CornerBracketsHoverExpand } from "@/components/ui/corner-brackets-hover-expand"
import {
  cornerPositionClasses,
  getCornerVisibility,
  type CornerBracketsProps,
} from "@/components/ui/corner-brackets-shared"

export type { CornerBracketsProps } from "@/components/ui/corner-brackets-shared"

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
      hoverScale,
    },
    ref
  ) => {
    const visibility = getCornerVisibility(corners)

    if (variant === "static") {
      return (
        <div ref={ref} className={className}>
          {visibility.topLeft && (
            <div
              className={`pointer-events-none absolute top-0 left-0 ${size} ${cornerPositionClasses.topLeft} ${color}`}
            />
          )}
          {visibility.topRight && (
            <div
              className={`pointer-events-none absolute top-0 right-0 ${size} ${cornerPositionClasses.topRight} ${color}`}
            />
          )}
          {visibility.bottomLeft && (
            <div
              className={`pointer-events-none absolute bottom-0 left-0 ${size} ${cornerPositionClasses.bottomLeft} ${color}`}
            />
          )}
          {visibility.bottomRight && (
            <div
              className={`pointer-events-none absolute right-0 bottom-0 ${size} ${cornerPositionClasses.bottomRight} ${color}`}
            />
          )}
        </div>
      )
    }

    if (variant === "hover") {
      return (
        <div ref={ref} className={className}>
          {visibility.topLeft && (
            <div
              className={`absolute top-0 left-0 ${size} ${cornerPositionClasses.topLeft} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {visibility.topRight && (
            <div
              className={`absolute top-0 right-0 ${size} ${cornerPositionClasses.topRight} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {visibility.bottomLeft && (
            <div
              className={`absolute bottom-0 left-0 ${size} ${cornerPositionClasses.bottomLeft} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {visibility.bottomRight && (
            <div
              className={`absolute right-0 bottom-0 ${size} ${cornerPositionClasses.bottomRight} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
        </div>
      )
    }

    if (variant === "hover-only") {
      return (
        <div ref={ref} className={className}>
          {visibility.topLeft && (
            <div
              className={`pointer-events-none absolute top-0 left-0 ${size} ${cornerPositionClasses.topLeft} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {visibility.topRight && (
            <div
              className={`pointer-events-none absolute top-0 right-0 ${size} ${cornerPositionClasses.topRight} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {visibility.bottomLeft && (
            <div
              className={`pointer-events-none absolute bottom-0 left-0 ${size} ${cornerPositionClasses.bottomLeft} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
          {visibility.bottomRight && (
            <div
              className={`pointer-events-none absolute right-0 bottom-0 ${size} ${cornerPositionClasses.bottomRight} ${color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
          )}
        </div>
      )
    }

    return (
      <CornerBracketsHoverExpand
        ref={ref}
        className={className}
        size={size}
        color={color}
        corners={corners}
        hoverScale={hoverScale}
      />
    )
  }
)

CornerBrackets.displayName = "CornerBrackets"
