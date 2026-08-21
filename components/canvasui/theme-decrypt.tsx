"use client"

import * as React from "react"
import { DecryptReveal } from "@/components/canvasui/DecryptReveal"

/**
 * Theme-aware DecryptReveal preset for GTMC surfaces. The cipher color and
 * backdrop must track `data-theme` (the WebGL pass compares content against
 * `background`, and the cipher tint should stay within the tech-signal
 * budget), so this wrapper observes the attribute and pushes updated
 * options into the effect.
 */
export function ThemeDecrypt({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [isDark, setIsDark] = React.useState(false)

  React.useEffect(() => {
    const root = document.documentElement
    const update = () => setIsDark(root.dataset.theme === "dark")
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })
    return () => observer.disconnect()
  }, [])

  return (
    <DecryptReveal
      className={className}
      radius={200}
      softness={0.55}
      cell={8}
      // Calm-instrumentation tuning: gentler wavefront than the library
      // defaults (aberration 10, glow 2), quieter idle mutation.
      aberration={4}
      edgeGlow={1.25}
      edgeTint={0.6}
      scramble={0.07}
      color={isDark ? "#5fb0d4" : "#1d6a96"}
      background={isDark ? "#101826" : "#f5f4ef"}>
      {children}
    </DecryptReveal>
  )
}
