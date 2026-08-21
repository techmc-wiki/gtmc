import * as React from "react"
import { Card } from "@/components/ui/shadcn/card"

/** Single labeled statistic readout. */
export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="compact">
      <p className="text-tech-main/60 mb-1 font-mono text-[0.625rem] tracking-[0.25em] uppercase">
        {label}
      </p>
      <p className="text-tech-main-dark text-lg font-semibold">{value}</p>
    </Card>
  )
}

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
