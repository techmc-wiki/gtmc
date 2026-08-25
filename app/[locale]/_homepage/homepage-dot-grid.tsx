"use client"

import { useEffect, useRef } from "react"
import DotGrid from "@/components/DotGrid"
import {
  addSiteScrollListener,
  getSiteScrollMetrics,
} from "@/hooks/site-scroll-root"
import { useDotPalette } from "@/hooks/use-dot-palette"

/**
 * Interactive dot-grid field behind the homepage hero. Echoes the site-wide
 * dot-grid backdrop motif; dots brighten to the blueprint signal near the
 * cursor and get pushed aside with inertia physics.
 *
 * Theme colors come from the shared useDotPalette hook, which follows the
 * runtime `data-theme` attribute (the single source of truth for theming).
 */
export function HomepageDotGrid() {
  const palette = useDotPalette()
  const fadeRef = useRef<HTMLDivElement>(null)

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
