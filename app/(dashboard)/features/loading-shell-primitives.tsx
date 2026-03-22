"use client"

import * as React from "react"

/**
 * Square section frame with optional corner brackets.
 * Reuses brutal-card corner bracket pattern for consistency.
 */
export const SectionFrame = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { showBrackets?: boolean }
>(
  (
    { className = "", showBrackets = true, children, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      className={`
        relative border border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm
        sm:p-8
        ${className}
      `}
      {...props}>
      {showBrackets && (
        <>
          <div className="
            pointer-events-none absolute top-0 left-0 size-2 -translate-px
            border-t-2 border-l-2 border-tech-main/60
          " />
          <div className="
            pointer-events-none absolute top-0 right-0 size-2 translate-x-px
            -translate-y-px border-t-2 border-r-2 border-tech-main/60
          " />
          <div className="
            pointer-events-none absolute bottom-0 left-0 size-2 -translate-x-px
            translate-y-px border-b-2 border-l-2 border-tech-main/60
          " />
          <div className="
            pointer-events-none absolute right-0 bottom-0 size-2 translate-px
            border-r-2 border-b-2 border-tech-main/60
          " />
        </>
      )}
      {children}
    </div>
  ),
)
SectionFrame.displayName = "SectionFrame"

/**
 * Monospace section rail label with trailing underscore.
 * Uppercase with wide letter spacing for technical aesthetic.
 */
export const SectionRail = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { label: string }
>(({ label, className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`
      font-mono text-xs tracking-tech-wide text-tech-main uppercase
      ${className}
    `}
    {...props}>
    {label}_
  </div>
))
SectionRail.displayName = "SectionRail"

/**
 * Segmented bar placeholder with opacity tier.
 * Used for skeleton loading states with subtle visual hierarchy.
 */
export const SegmentedBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    opacity?: "high" | "medium" | "low"
    showBorder?: boolean
  }
>(
  (
    {
      opacity = "medium",
      showBorder = false,
      className = "",
      ...props
    },
    ref,
  ) => {
    const opacityMap = {
      high: "bg-tech-accent/20",
      medium: "bg-tech-accent/15",
      low: "bg-tech-accent/10",
    }

    return (
      <div
        ref={ref}
        className={`
          h-2
          ${opacityMap[opacity]}
          ${showBorder ? `border border-tech-line` : ""}
          ${className}
        `}
        {...props}
      />
    )
  },
)
SegmentedBar.displayName = "SegmentedBar"

/**
 * Skeleton exit wrapper for loading shell handoff.
 * Applies skeleton-exit animation: opacity fade + subtle translateY + blur.
 * Motion-reduce fallback: opacity-only fade.
 */
export const SkeletonExitWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { isExiting?: boolean }
>(({ isExiting = false, className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`
      ${isExiting ? `
        animate-skeleton-exit
        motion-reduce:animate-fade-out
      ` : ""}
      ${className}
    `}
    {...props}
  />
))
SkeletonExitWrapper.displayName = "SkeletonExitWrapper"

/**
 * Scan/sweep overlay with blueprint animation.
 * Absolute positioned shimmer effect with motion-reduce fallback.
 */
export const SweepOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`
      absolute inset-0 animate-blueprint-sweep bg-linear-to-r from-transparent
      via-tech-accent/30 to-transparent
      motion-reduce:animate-none
      ${className}
    `}
    {...props}
  />
))
SweepOverlay.displayName = "SweepOverlay"

/**
 * Single-pass scan confirmation overlay.
 * Absolute positioned gradient fade for loading-to-content transition.
 */
export const ScanConfirmOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`
      absolute inset-0 animate-scan-confirm bg-linear-to-r from-transparent
      via-tech-accent/30 to-transparent
      motion-reduce:animate-none
      ${className}
    `}
    {...props}
  />
))
ScanConfirmOverlay.displayName = "ScanConfirmOverlay"
