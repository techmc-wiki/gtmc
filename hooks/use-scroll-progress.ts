"use client"

import * as React from "react"
import {
  addSiteScrollListener,
  getSiteScrollMetrics,
  getSiteScrollProgress,
} from "@/hooks/site-scroll-root"

interface ScrollProgressOptions {
  navbarThreshold?: number
}

export function useScrollProgress({
  navbarThreshold,
}: ScrollProgressOptions = {}) {
  const [progressPercentage, setProgressPercentage] = React.useState(0)
  const [hasScrolledPastNavbar, setHasScrolledPastNavbar] =
    React.useState(false)

  React.useEffect(() => {
    let animationFrame: number | null = null

    const updateProgress = () => {
      animationFrame = null
      const progress = getSiteScrollProgress()
      const { scrollTop } = getSiteScrollMetrics()

      setProgressPercentage(Math.round(progress * 100))

      if (navbarThreshold !== undefined) {
        setHasScrolledPastNavbar(scrollTop > navbarThreshold)
      }
    }

    const scheduleProgressUpdate = () => {
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(updateProgress)
    }

    updateProgress()
    const removeScrollListener = addSiteScrollListener(scheduleProgressUpdate, {
      passive: true,
    })

    return () => {
      removeScrollListener()
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
      }
    }
  }, [navbarThreshold])

  return {
    hasScrolledPastNavbar,
    progress: progressPercentage / 100,
  }
}
