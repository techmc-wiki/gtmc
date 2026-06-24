"use client"

import * as React from "react"
import {
  cornerPositionClasses,
  getBracketStyle,
  getCornerVisibility,
  sizeToPx,
  type CornerBracketsProps,
} from "@/components/ui/corner-brackets-shared"

export function CornerBracketsHoverExpand({
  className,
  size = "size-2",
  color = "border-tech-main/40",
  corners = "all",
  hoverScale = 1.5,
  ref,
}: Omit<CornerBracketsProps, "variant"> & {
  ref?: React.Ref<HTMLDivElement>
}) {
  const basePx = sizeToPx[size] ?? 8
  const visibility = getCornerVisibility(corners)
  const bracketStyle = getBracketStyle(basePx)

  const handleMouseEnter = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.currentTarget.style.setProperty(
        "--bracket-size",
        `${basePx * hoverScale}px`
      )
    },
    [basePx, hoverScale]
  )

  const handleMouseLeave = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.currentTarget.style.setProperty("--bracket-size", `${basePx}px`)
    },
    [basePx]
  )

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {visibility.topLeft && (
        <div
          className={`pointer-events-none absolute top-0 left-0 ${cornerPositionClasses.topLeft} ${color} transition-all`}
          style={bracketStyle}
        />
      )}
      {visibility.topRight && (
        <div
          className={`pointer-events-none absolute top-0 right-0 ${cornerPositionClasses.topRight} ${color} transition-all`}
          style={bracketStyle}
        />
      )}
      {visibility.bottomLeft && (
        <div
          className={`pointer-events-none absolute bottom-0 left-0 ${cornerPositionClasses.bottomLeft} ${color} transition-all`}
          style={bracketStyle}
        />
      )}
      {visibility.bottomRight && (
        <div
          className={`pointer-events-none absolute right-0 bottom-0 ${cornerPositionClasses.bottomRight} ${color} transition-all`}
          style={bracketStyle}
        />
      )}
    </div>
  )
}
