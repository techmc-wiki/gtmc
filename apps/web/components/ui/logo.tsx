import * as React from "react"
import { Link } from "@/i18n/navigation"
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
 * (not `<img>`) so the active variant swaps via `[data-theme]` (no client JS,
 * hydration-safe, and avoids the `next/image` SVG limitation).
 */
function LogoMark({ className = "", title }: LogoMarkProps) {
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

interface LogoProps {
  className?: string
  size?: "md" | "lg"
}

const sizeClasses = {
  md: "text-lg",
  lg: "text-2xl",
} as const

const markClasses = {
  md: "size-5",
  lg: "size-7",
} as const

export function Logo({ className = "", size = "md" }: LogoProps) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2 transition-opacity hover:opacity-80 ${sizeClasses[size]} ${className} `}>
      <LogoMark className={`shrink-0 ${markClasses[size]}`} />
      <span className="display-title text-tech-main-dark tracking-tight">
        GTMC
      </span>
    </Link>
  )
}
