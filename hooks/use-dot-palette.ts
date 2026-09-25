"use client"

import { useSyncExternalStore } from "react"

const DOT_PALETTES = {
  light: { base: "#d6d3c8", active: "#1d6a96" },
  dark: { base: "#243248", active: "#5fb0d4" },
} as const

export interface DotPalette {
  base: string
  active: string
}

function getDotPaletteThemeSnapshot(): keyof typeof DOT_PALETTES {
  if (typeof document === "undefined") return "light"
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light"
}

function getDotPaletteThemeServerSnapshot(): keyof typeof DOT_PALETTES {
  return "light"
}

function subscribeDotPaletteTheme(callback: () => void): () => void {
  if (
    typeof document === "undefined" ||
    typeof MutationObserver === "undefined"
  ) {
    return () => {}
  }
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  })
  return () => observer.disconnect()
}

/** Keeps the homepage and footer dot fields synchronized with the document's runtime theme. */
export function useDotPalette(): DotPalette {
  const theme = useSyncExternalStore(
    subscribeDotPaletteTheme,
    getDotPaletteThemeSnapshot,
    getDotPaletteThemeServerSnapshot
  )
  return DOT_PALETTES[theme]
}
