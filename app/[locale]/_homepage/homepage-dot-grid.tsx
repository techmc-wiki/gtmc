"use client"

import { useEffect, useRef, useState } from "react"
import DotGrid from "@/components/DotGrid"
import {
  addSiteScrollListener,
  getSiteScrollMetrics,
} from "@/hooks/site-scroll-root"

/**
 * Interactive dot-grid field behind the homepage hero. Echoes the site-wide
 * dot-grid backdrop motif; dots brighten to the blueprint signal near the
 * cursor and get pushed aside with inertia physics.
 *
 * Theme colors follow the runtime `data-theme` attribute (the single source
 * of truth for theming) via a attribute MutationObserver.
 */

const PALETTES = {
  light: { base: "#d6d3c8", active: "#1d6a96" },
  dark: { base: "#243248", active: "#5fb0d4" },
} as const

function currentTheme(): keyof typeof PALETTES {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light"
}

export function HomepageDotGrid() {
  const [theme, setTheme] = useState<keyof typeof PALETTES>("light")
  const fadeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTheme(currentTheme())
    const observer = new MutationObserver(() => setTheme(currentTheme()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })
    return () => observer.disconnect()
  }, [])

  // Fade the field out across the first viewport so the TOC reads on calm
  // paper instead of a busy dot matrix.
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

  const palette = PALETTES[theme]

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
