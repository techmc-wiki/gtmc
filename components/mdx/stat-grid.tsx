import * as React from "react"

/**
 * Responsive grid for `StatCard` readouts. `wide` fills four columns on
 * desktop (the text-so-far summary); `pair` keeps two columns (compact
 * two-stat readouts).
 */
export function StatGrid({
  variant = "wide",
  children,
}: {
  variant?: "wide" | "pair"
  children: React.ReactNode
}) {
  return (
    <div
      className={
        variant === "pair"
          ? "grid grid-cols-2 gap-4"
          : "grid grid-cols-2 gap-4 md:grid-cols-4"
      }>
      {children}
    </div>
  )
}
