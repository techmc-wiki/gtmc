import type { CSSProperties } from "react"

export interface CornerBracketsProps {
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

export const sizeToPx: Record<string, number> = {
  "size-1": 4,
  "size-2": 8,
  "size-3": 12,
  "size-4": 16,
  "size-5": 20,
  "size-6": 24,
  "size-8": 32,
}

export const cornerPositionClasses = {
  topLeft: "-translate-px border-t-2 border-l-2",
  topRight: "translate-x-px -translate-y-px border-t-2 border-r-2",
  bottomLeft: "-translate-x-px translate-y-px border-b-2 border-l-2",
  bottomRight: "translate-px border-r-2 border-b-2",
} as const

export function getCornerVisibility(
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

export function getBracketStyle(basePx: number): CSSProperties {
  return {
    width: "var(--bracket-size)",
    height: "var(--bracket-size)",
    "--bracket-size": `${basePx}px`,
  } as CSSProperties
}
