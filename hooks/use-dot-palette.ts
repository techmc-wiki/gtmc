"use client"

import { useEffect, useState } from "react"

const DOT_PALETTES = {
  light: { base: "#d6d3c8", active: "#1d6a96" },
  dark: { base: "#243248", active: "#5fb0d4" },
} as const

export interface DotPalette {
  base: string
  active: string
}

/**
 * Interactive dot-field colors for the runtime theme (`data-theme` is the
 * single source of truth). Shared by the homepage hero field and the footer
 * field so both bookends stay in lockstep across themes.
 */
export function useDotPalette(): DotPalette {
  const [theme, setTheme] = useState<keyof typeof DOT_PALETTES>("light")

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "dark" : "light"
    )
    const observer = new MutationObserver(() =>
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light"
      )
    )
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })
    return () => observer.disconnect()
  }, [])

  return DOT_PALETTES[theme]
}
