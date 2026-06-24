import * as React from "react"
import { CornerBrackets } from "@/components/ui/corner-brackets"

/**
 * Square section frame with optional corner brackets.
 * Reuses shared CornerBrackets primitive for consistency.
 */
export function SectionFrame({
  className = "",
  showBrackets = true,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  showBrackets?: boolean
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={`border-tech-main/40 bg-surface-overlay/80 relative border p-6 backdrop-blur-sm sm:p-8 ${className} `}
      {...props}>
      {showBrackets && (
        <CornerBrackets size="size-2" color="border-tech-main/60" />
      )}
      {children}
    </div>
  )
}

/**
 * Monospace section rail label with trailing underscore.
 * Uppercase with wide letter spacing for technical aesthetic.
 */
export function SectionRail({
  label,
  className = "",
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  label: string
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={`tracking-tech-wide text-tech-main font-mono text-xs uppercase ${className} `}
      {...props}>
      {label}_
    </div>
  )
}

/**
 * Segmented bar placeholder with opacity tier.
 * Used for skeleton loading states with subtle visual hierarchy.
 */
export function SegmentedBar({
  opacity = "medium",
  showBorder = false,
  className = "",
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  opacity?: "high" | "medium" | "low"
  showBorder?: boolean
  ref?: React.Ref<HTMLDivElement>
}) {
  const opacityMap = {
    high: "bg-tech-accent/20",
    medium: "bg-tech-accent/15",
    low: "bg-tech-accent/10",
  }

  return (
    <div
      ref={ref}
      className={`h-2 ${opacityMap[opacity]} ${showBorder ? `border-tech-line border` : ""} ${className} `}
      {...props}
    />
  )
}

/**
 * Skeleton exit wrapper for loading shell handoff.
 * Applies skeleton-exit animation: opacity fade + subtle translateY + blur.
 * Motion-reduce fallback: opacity-only fade.
 */
export function SkeletonExitWrapper({
  isExiting = false,
  className = "",
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  isExiting?: boolean
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={` ${
        isExiting ? `animate-skeleton-exit motion-reduce:animate-fade-out` : ""
      } ${className} `}
      {...props}
    />
  )
}

/**
 * Scan/sweep overlay with blueprint animation.
 * Absolute positioned shimmer effect with motion-reduce fallback.
 */
export function SweepOverlay({
  className = "",
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={`animate-blueprint-sweep via-tech-accent/30 absolute inset-0 bg-linear-to-r from-transparent to-transparent motion-reduce:animate-none ${className} `}
      {...props}
    />
  )
}

/**
 * Single-pass scan confirmation overlay.
 * Absolute positioned gradient fade for loading-to-content transition.
 */
export function ScanConfirmOverlay({
  className = "",
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={`animate-scan-confirm via-tech-accent/30 absolute inset-0 bg-linear-to-r from-transparent to-transparent motion-reduce:animate-none ${className} `}
      {...props}
    />
  )
}
