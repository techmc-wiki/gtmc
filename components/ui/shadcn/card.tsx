import * as React from "react"

import { CornerBrackets } from "@/components/ui/corner-brackets"
import { cn } from "@/lib/cn"

/* GTMC surface system (formerly TechCard), folded into the shadcn Card. */
type CardTone = "main" | "danger"
type CardBorderOpacity = "solid" | "medium" | "muted" | "subtle"
type CardBackground = "default" | "subtle" | "ghost"
type CardPadding = "default" | "compact" | "spacious" | "none"
type CardHover = "default" | "none" | "border" | "elevated"
type CardBracketVariant = React.ComponentProps<typeof CornerBrackets>["variant"]
type CardPattern = "none" | "grid"

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
  CardTone,
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
} as const satisfies Record<CardBorderOpacity, string>

const paddingClasses = {
  default: "p-4 sm:p-6",
  compact: "p-4",
  spacious: "p-6 sm:p-8",
  none: "p-0",
} as const satisfies Record<CardPadding, string>

const patternClasses = {
  none: "",
  grid: "bg-[url('/bg-grid.svg')] bg-size-[24px_24px]",
} as const satisfies Record<CardPattern, string>

function getBorderClass(tone: CardTone, borderOpacity: CardBorderOpacity) {
  if (borderOpacity === "solid") {
    return toneClasses[tone].solidBorder
  }

  return `${toneClasses[tone].border}${borderOpacityClasses[borderOpacity]}`
}

function getBackgroundClass(tone: CardTone, background: CardBackground) {
  if (background === "default") {
    return toneClasses[tone].background
  }

  if (background === "subtle") {
    return toneClasses[tone].subtleBackground
  }

  return "bg-surface-overlay/40"
}

function getHoverClass(tone: CardTone, hover: CardHover) {
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

function Card({
  className,
  tone = "main",
  borderOpacity = "solid",
  background = "default",
  padding = "default",
  hover = "default",
  brackets = "hidden",
  bracketVariant = "static",
  pattern = "none",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** Tone maps the main frame or danger state used by current cards. */
  tone?: CardTone
  /** Border opacity maps the audited card shells. */
  borderOpacity?: CardBorderOpacity
  /** Background maps the current default, tinted, and ghost surfaces. */
  background?: CardBackground
  /** Padding maps current card spacing. */
  padding?: CardPadding
  /** Hover maps current surface, border-only, elevated, or disabled states. */
  hover?: CardHover
  /** Controls the built-in corner brackets. */
  brackets?: "visible" | "hidden"
  /** Passes through to CornerBrackets for static or hover behavior. */
  bracketVariant?: CardBracketVariant
  /** Optional blueprint grid pattern. */
  pattern?: CardPattern
}) {
  return (
    <div
      data-slot="card"
      className={cn(
        "group relative border backdrop-blur-sm transition-colors duration-300 rounded-none",
        getBorderClass(tone, borderOpacity),
        getBackgroundClass(tone, background),
        paddingClasses[padding],
        getHoverClass(tone, hover),
        toneClasses[tone].text,
        className
      )}
      {...props}>
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

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-b]:pb-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
