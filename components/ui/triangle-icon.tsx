import type { SVGProps } from "react"

type TriangleDirection = "down" | "left" | "right"

interface TriangleIconProps extends SVGProps<SVGSVGElement> {
  direction: TriangleDirection
}

const pathByDirection = {
  down: "M3.5 5.5h9L8 12.5 3.5 5.5Z",
  left: "M10.5 3.5v9L3.5 8l7-4.5Z",
  right: "M5.5 3.5 12.5 8l-7 4.5v-9Z",
} satisfies Record<TriangleDirection, string>

export function TriangleIcon({
  direction,
  className,
  ...props
}: TriangleIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}>
      <path d={pathByDirection[direction]} fill="currentColor" />
    </svg>
  )
}
