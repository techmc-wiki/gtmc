"use client";

import * as React from "react";

/**
 * Square section frame with optional corner brackets.
 * Reuses brutal-card corner bracket pattern for consistency.
 */
export const SectionFrame = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { showBrackets?: boolean }
>(({ className = "", showBrackets = true, children, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative border border-tech-main/40 bg-white/80 backdrop-blur-sm p-6 sm:p-8 ${className}`}
    {...props}
  >
    {showBrackets && (
      <>
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-tech-main/60 -translate-x-[1px] -translate-y-[1px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-tech-main/60 translate-x-[1px] -translate-y-[1px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-tech-main/60 -translate-x-[1px] translate-y-[1px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-tech-main/60 translate-x-[1px] translate-y-[1px] pointer-events-none" />
      </>
    )}
    {children}
  </div>
));
SectionFrame.displayName = "SectionFrame";

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
    className={`font-mono uppercase tracking-[0.2em] text-xs text-tech-main ${className}`}
    {...props}
  >
    {label}_
  </div>
));
SectionRail.displayName = "SectionRail";

/**
 * Segmented bar placeholder with opacity tier.
 * Used for skeleton loading states with subtle visual hierarchy.
 */
export const SegmentedBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    opacity?: "high" | "medium" | "low";
    showBorder?: boolean;
  }
>(({ opacity = "medium", showBorder = false, className = "", ...props }, ref) => {
  const opacityMap = {
    high: "bg-tech-accent/20",
    medium: "bg-tech-accent/15",
    low: "bg-tech-accent/10",
  };

  return (
    <div
      ref={ref}
      className={`h-2 ${opacityMap[opacity]} ${showBorder ? "border border-tech-line" : ""} ${className}`}
      {...props}
    />
  );
});
SegmentedBar.displayName = "SegmentedBar";

/**
 * Scan/sweep overlay with blueprint animation.
 * Absolute positioned shimmer effect with motion-reduce fallback.
 */
export const SweepOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`absolute inset-0 bg-gradient-to-r from-transparent via-tech-accent/30 to-transparent animate-blueprint-sweep motion-reduce:animate-none ${className}`}
      {...props}
    />
  ),
);
SweepOverlay.displayName = "SweepOverlay";

/**
 * Single-pass scan confirmation overlay.
 * Absolute positioned gradient with scan-confirm animation (0.6s fade).
 */
export const ScanConfirmOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`absolute inset-0 bg-gradient-to-r from-transparent via-tech-accent/30 to-transparent animate-scan-confirm motion-reduce:animate-none ${className}`}
      {...props}
    />
  ),
);
ScanConfirmOverlay.displayName = "ScanConfirmOverlay";
