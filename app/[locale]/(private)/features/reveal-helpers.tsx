import * as React from "react"

type RevealDelay = 0 | 100 | 200 | 300 | 400

const DELAY_STYLES: Record<RevealDelay, React.CSSProperties> = {
  0: { animationDelay: "0ms" },
  100: { animationDelay: "100ms" },
  200: { animationDelay: "200ms" },
  300: { animationDelay: "300ms" },
  400: { animationDelay: "400ms" },
}

/**
 * Server-safe reveal wrapper for resolved content sections.
 * Applies staged animation delays matching loading shell timing (0ms, 100ms, 200ms, 300ms, 400ms).
 * Uses simple fade-in: plain opacity transition only.
 */
export function RevealSection({
  delay = 0,
  className = "",
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  delay?: RevealDelay
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={`animate-fade-in ${className} `}
      style={DELAY_STYLES[delay]}
      {...props}
    />
  )
}

/**
 * Fade-in wrapper for content that should reveal after frame settles.
 * Lighter animation for secondary content within sections.
 */
export function RevealContent({
  delay = 0,
  className = "",
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  delay?: RevealDelay
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={`animate-fade-in ${className} `}
      style={DELAY_STYLES[delay]}
      {...props}
    />
  )
}
