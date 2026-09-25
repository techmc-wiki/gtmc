"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import DotGrid from "@/components/DotGrid"
import {
  addSiteScrollListener,
  getSiteScrollMetrics,
} from "@/hooks/site-scroll-root"

const DOT_PALETTES = {
  light: { base: "#d6d3c8", active: "#1d6a96" },
  dark: { base: "#243248", active: "#5fb0d4" },
} as const

interface DotPalette {
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

/** Keeps the homepage dot field synchronized with the document's runtime theme. */
function useDotPalette(): DotPalette {
  const theme = useSyncExternalStore(
    subscribeDotPaletteTheme,
    getDotPaletteThemeSnapshot,
    getDotPaletteThemeServerSnapshot
  )
  return DOT_PALETTES[theme]
}

/** Uses the runtime theme as the source of truth so canvas colors follow theme changes without remounting. */
export function HomepageDotGrid() {
  const palette = useDotPalette()
  const fadeRef = useRef<HTMLDivElement>(null)

  // Fade the field within the first viewport to keep TOC content visually dominant.
  useEffect(() => {
    let raf = 0
    const apply = () => {
      raf = 0
      const el = fadeRef.current
      if (!el) return
      const { scrollTop } = getSiteScrollMetrics()
      const range = window.innerHeight * 0.85
      el.style.opacity = Math.max(0, 1 - scrollTop / range).toFixed(3)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    apply()
    return addSiteScrollListener(onScroll)
  }, [])

  return (
    <div ref={fadeRef} className="pointer-events-none absolute inset-0">
      <DotGrid
        dotSize={3}
        gap={26}
        baseColor={palette.base}
        activeColor={palette.active}
        proximity={140}
        speedTrigger={120}
        className="absolute inset-0"
      />
    </div>
  )
}
