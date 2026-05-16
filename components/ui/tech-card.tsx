"use client"

import * as React from "react"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { cn } from "@/lib/cn"

export type TechCardTone =
  | "main"
  | "accent"
  | "danger"
  | "success"
  | "warning"
  | "neutral"

export type TechCardBorderOpacity = "solid" | "medium" | "muted" | "subtle"

export type TechCardBackground =
  | "default"
  | "solid"
  | "subtle"
  | "ghost"
  | "transparent"

export type TechCardPadding = "default" | "compact" | "spacious" | "none"

export type TechCardHover =
  | "default"
  | "none"
  | "border"
  | "surface"
  | "elevated"

export type TechCardBracketVisibility = "visible" | "hidden"

export type TechCardBracketVariant = React.ComponentProps<
  typeof CornerBrackets
>["variant"]

export type TechCardLegacyColor =
  | "white"
  | "electric-blue"
  | "neon-green"
  | "hot-pink"
  | "black"
  | "sun-yellow"

export type TechCardPattern = "none" | "dots" | "grid"

const toneClasses = {
  main: {
    border: "border-tech-main",
    solidBorder: "border-tech-main",
    background: "bg-white/80",
    subtleBackground: "bg-tech-main/5",
    text: "text-tech-main",
    bracket: "border-tech-main/40",
    hoverBorder: "hover:border-tech-main/60",
    hoverSurface: "hover:bg-tech-accent/10",
    hoverElevated: "hover:shadow-[0_0_20px_rgb(var(--color-tech-main)/0.15)]",
  },
  accent: {
    border: "border-tech-accent",
    solidBorder: "border-tech-accent",
    background: "bg-white/80",
    subtleBackground: "bg-tech-accent/5",
    text: "text-tech-main",
    bracket: "border-tech-accent/40",
    hoverBorder: "hover:border-tech-accent/60",
    hoverSurface: "hover:bg-tech-accent/10",
    hoverElevated: "hover:shadow-[0_0_20px_rgb(var(--color-tech-accent)/0.15)]",
  },
  danger: {
    border: "border-red-500",
    solidBorder: "border-red-500",
    background: "bg-red-500/10",
    subtleBackground: "bg-red-500/10",
    text: "text-red-700",
    bracket: "border-red-500/50",
    hoverBorder: "hover:border-red-500/70",
    hoverSurface: "hover:bg-red-500/15",
    hoverElevated: "hover:shadow-[0_0_20px_rgb(239_68_68/0.15)]",
  },
  success: {
    border: "border-emerald-500",
    solidBorder: "border-emerald-500",
    background: "bg-emerald-500/10",
    subtleBackground: "bg-emerald-500/10",
    text: "text-emerald-700",
    bracket: "border-emerald-500/40",
    hoverBorder: "hover:border-emerald-500/60",
    hoverSurface: "hover:bg-emerald-500/15",
    hoverElevated: "hover:shadow-[0_0_20px_rgb(16_185_129/0.15)]",
  },
  warning: {
    border: "border-yellow-400",
    solidBorder: "border-yellow-400",
    background: "bg-yellow-100/50",
    subtleBackground: "bg-yellow-100/50",
    text: "text-yellow-700",
    bracket: "border-yellow-400/50",
    hoverBorder: "hover:border-yellow-400/70",
    hoverSurface: "hover:bg-yellow-100/70",
    hoverElevated: "hover:shadow-[0_0_20px_rgb(250_204_21/0.15)]",
  },
  neutral: {
    border: "border-tech-line",
    solidBorder: "border-tech-line",
    background: "bg-white/80",
    subtleBackground: "bg-tech-bg",
    text: "text-tech-main",
    bracket: "border-tech-main/30",
    hoverBorder: "hover:border-tech-main/40",
    hoverSurface: "hover:bg-tech-bg",
    hoverElevated: "hover:shadow-[0_0_20px_rgb(var(--color-tech-main)/0.1)]",
  },
} as const satisfies Record<
  TechCardTone,
  Record<
    | "border"
    | "solidBorder"
    | "background"
    | "subtleBackground"
    | "text"
    | "bracket"
    | "hoverBorder"
    | "hoverSurface"
    | "hoverElevated",
    string
  >
>

const borderOpacityClasses = {
  solid: "",
  medium: "/60",
  muted: "/40",
  subtle: "/30",
} as const satisfies Record<TechCardBorderOpacity, string>

const paddingClasses = {
  default: "p-4 sm:p-6",
  compact: "p-4",
  spacious: "p-6 sm:p-8",
  none: "p-0",
} as const satisfies Record<TechCardPadding, string>

const legacyColorTone = {
  white: "main",
  "electric-blue": "accent",
  "neon-green": "success",
  "hot-pink": "danger",
  black: "neutral",
  "sun-yellow": "warning",
} as const satisfies Record<TechCardLegacyColor, TechCardTone>

const legacyColorBackground = {
  white: "bg-white/80",
  "electric-blue": "bg-blue-500/10",
  "neon-green": "bg-emerald-500/10",
  "hot-pink": "bg-pink-500/10",
  black: "bg-zinc-950/90",
  "sun-yellow": "bg-yellow-100/50",
} as const satisfies Record<TechCardLegacyColor, string>

const patternClasses = {
  none: "",
  dots: "bg-[radial-gradient(circle_at_center,rgb(var(--color-tech-main)/0.12)_1px,transparent_1px)] bg-size-[16px_16px]",
  grid: "bg-[url('/bg-grid.svg')] bg-size-[24px_24px]",
} as const satisfies Record<TechCardPattern, string>

function getBorderClass(
  tone: TechCardTone,
  borderOpacity: TechCardBorderOpacity
) {
  if (borderOpacity === "solid") {
    return toneClasses[tone].solidBorder
  }

  return `${toneClasses[tone].border}${borderOpacityClasses[borderOpacity]}`
}

function getBackgroundClass(
  tone: TechCardTone,
  background: TechCardBackground,
  color?: TechCardLegacyColor
) {
  if (color) {
    return legacyColorBackground[color]
  }

  if (background === "default" || background === "solid") {
    return toneClasses[tone].background
  }

  if (background === "subtle") {
    return toneClasses[tone].subtleBackground
  }

  if (background === "ghost") {
    return "bg-white/40"
  }

  return "bg-transparent"
}

function getHoverClass(tone: TechCardTone, hover: TechCardHover) {
  if (hover === "default" || hover === "surface") {
    return toneClasses[tone].hoverSurface
  }

  if (hover === "border") {
    return toneClasses[tone].hoverBorder
  }

  if (hover === "elevated") {
    return cn(
      toneClasses[tone].hoverBorder,
      toneClasses[tone].hoverSurface,
      toneClasses[tone].hoverElevated
    )
  }

  return ""
}

export interface TechCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tone maps audited frame accents: main, accent, danger, success, warning, neutral. */
  tone?: TechCardTone
  /** Border opacity maps solid, /60, /40, and /30 shells used around dashboard cards. */
  borderOpacity?: TechCardBorderOpacity
  /** Background maps existing white, tinted, ghost, and transparent frame surfaces. */
  background?: TechCardBackground
  /** Padding maps default card padding, compact, spacious section frames, and no-padding shells. */
  padding?: TechCardPadding
  /** Hover maps the current surface fade, border-only, elevated, or disabled hover styles. */
  hover?: TechCardHover
  /** Controls the built-in corner brackets without requiring duplicate bracket markup. */
  brackets?: TechCardBracketVisibility
  /** Passes through to CornerBrackets for static or hover bracket behavior. */
  bracketVariant?: TechCardBracketVariant
  /** Legacy color alias retained for existing callers; prefer tone/background for new code. */
  color?: TechCardLegacyColor
  /** Optional blueprint surface pattern used by existing frame shells. */
  pattern?: TechCardPattern
}

export const TechCard = React.forwardRef<HTMLDivElement, TechCardProps>(
  (
    {
      className,
      children,
      tone: toneProp,
      borderOpacity = "solid",
      background = "default",
      padding = "default",
      hover = "default",
      brackets = "visible",
      bracketVariant = "static",
      color,
      pattern = "none",
      ...props
    },
    ref
  ) => {
    const tone = toneProp ?? (color ? legacyColorTone[color] : "main")

    // 技术扁平图纸感：细边框，无圆角，纯色几何；响应式内边距
    const baseStyles = cn(
      "group relative border backdrop-blur-sm transition-colors duration-300",
      getBorderClass(tone, borderOpacity),
      getBackgroundClass(tone, background, color),
      paddingClasses[padding],
      getHoverClass(tone, hover),
      toneClasses[tone].text
    )

    return (
      <div ref={ref} className={cn(baseStyles, className)} {...props}>
        {/* 卡片的十字定位角标 */}
        {brackets === "visible" && (
          <CornerBrackets
            color={toneClasses[tone].bracket}
            variant={bracketVariant}
          />
        )}

        {pattern !== "none" && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-0 opacity-[0.03]",
              patternClasses[pattern]
            )}
          />
        )}

        {children}
      </div>
    )
  }
)
TechCard.displayName = "TechCard"
