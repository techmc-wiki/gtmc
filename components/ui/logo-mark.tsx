import lightMark from "@/public/logo-mark-light.svg"
import darkMark from "@/public/logo-mark-dark.svg"

const markStyle: React.CSSProperties = {
  ["--gtmc-mark-light" as string]: `url("${lightMark.src}")`,
  ["--gtmc-mark-dark" as string]: `url("${darkMark.src}")`,
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
}

interface LogoMarkProps {
  className?: string
  title?: string
}

/**
 * GTMC brand mark. Two static SVGs (one per theme) keep the paper-tone glyph
 * readable on both cream and dark surfaces. Rendered as a CSS background image
 * (not `<img>`) so the active variant swaps via `[data-theme]` — no client JS,
 * hydration-safe, and avoids the `next/image` SVG limitation.
 */
export function LogoMark({ className = "", title }: LogoMarkProps) {
  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={markStyle}
      className={`gtmc-logo-mark-bg ${className}`}
    />
  )
}
