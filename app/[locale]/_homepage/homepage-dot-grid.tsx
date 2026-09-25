"use client"

import { useEffect, useRef } from "react"
import DotGrid from "@/components/DotGrid"
import {
  addSiteScrollListener,
  getSiteScrollMetrics,
} from "@/hooks/site-scroll-root"
import { useDotPalette } from "@/hooks/use-dot-palette"

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
