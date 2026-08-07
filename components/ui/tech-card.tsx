"use client"

import * as React from "react"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { cn } from "@/lib/cn"

type TechCardTone = "main" | "danger"
type TechCardBorderOpacity = "solid" | "medium" | "muted" | "subtle"
type TechCardBackground = "default" | "subtle" | "ghost"
type TechCardPadding = "default" | "compact" | "spacious" | "none"
type TechCardHover = "default" | "none" | "border" | "elevated"
type TechCardBracketVisibility = "visible" | "hidden"
type TechCardBracketVariant = React.ComponentProps<
  typeof CornerBrackets
>["variant"]
type TechCardPattern = "none" | "grid"

const toneClasses = {
  main: {
    border: "border-tech-main",
    solidBorder: "border-tech-main",
    background: "bg-surface-overlay/80",
    subtleBackground: "bg-tech-main/5",
    text: "text-tech-main",
    bracket: "border-tech-main/40",
    hoverBorder: "hover:border-tech-main/60",
    hoverSurface: "hover:bg-tech-accent/10",
    hoverElevated: "hover:shadow-[0_0_20px_rgb(var(--color-tech-main)/0.15)]",
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

const patternClasses = {
  none: "",
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
  background: TechCardBackground
) {
  if (background === "default") {
    return toneClasses[tone].background
  }

  if (background === "subtle") {
    return toneClasses[tone].subtleBackground
  }

  return "bg-surface-overlay/40"
}

function getHoverClass(tone: TechCardTone, hover: TechCardHover) {
  if (hover === "default") {
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
  /** Tone maps the main frame or danger state used by current cards. */
  tone?: TechCardTone
  /** Border opacity maps the audited card shells. */
  borderOpacity?: TechCardBorderOpacity
  /** Background maps the current default, tinted, and ghost surfaces. */
  background?: TechCardBackground
  /** Padding maps current card spacing. */
  padding?: TechCardPadding
  /** Hover maps current surface, border-only, elevated, or disabled states. */
  hover?: TechCardHover
  /** Controls the built-in corner brackets. */
  brackets?: TechCardBracketVisibility
  /** Passes through to CornerBrackets for static or hover behavior. */
  bracketVariant?: TechCardBracketVariant
  /** Optional blueprint grid pattern. */
  pattern?: TechCardPattern
  ref?: React.Ref<HTMLDivElement>
}

export function TechCard({
  className,
  children,
  tone: toneProp,
  borderOpacity = "solid",
  background = "default",
  padding = "default",
  hover = "default",
  brackets = "visible",
  bracketVariant = "static",
  pattern = "none",
  ref,
  ...props
}: TechCardProps) {
  const tone = toneProp ?? "main"
  const baseStyles = cn(
    "group relative border backdrop-blur-sm transition-colors duration-300",
    getBorderClass(tone, borderOpacity),
    getBackgroundClass(tone, background),
    paddingClasses[padding],
    getHoverClass(tone, hover),
    toneClasses[tone].text
  )

  return (
    <div ref={ref} className={cn(baseStyles, className)} {...props}>
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
