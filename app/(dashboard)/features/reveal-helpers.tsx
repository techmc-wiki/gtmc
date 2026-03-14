import * as React from "react";

/**
 * Server-safe reveal wrapper for resolved content sections.
 * Applies staged animation delays matching loading shell timing (0ms, 100ms, 200ms, 300ms, 400ms).
 * Reuses animate-tech-slide-in from globals.css for frame continuity.
 */
export const RevealSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { delay?: 0 | 100 | 200 | 300 | 400 }
>(({ delay = 0, className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`animate-tech-slide-in ${className}`}
    style={{ animationDelay: `${delay}ms` }}
    {...props}
  />
));
RevealSection.displayName = "RevealSection";

/**
 * Fade-in wrapper for content that should reveal after frame settles.
 * Lighter animation for secondary content within sections.
 */
export const RevealContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { delay?: 0 | 100 | 200 | 300 | 400 }
>(({ delay = 0, className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`animate-fade-in ${className}`}
    style={{ animationDelay: `${delay}ms` }}
    {...props}
  />
));
RevealContent.displayName = "RevealContent";
