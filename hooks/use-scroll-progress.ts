"use client"

import * as React from "react"
import {
  addSiteScrollListener,
  getSiteScrollMetrics,
} from "@/hooks/site-scroll-root"

interface ScrollProgressOptions {
  navbarThreshold?: number
}

export function useScrollProgress({
  navbarThreshold,
}: ScrollProgressOptions = {}) {
  const [progress, setProgress] = React.useState(0)
  const [hasScrolledPastNavbar, setHasScrolledPastNavbar] =
    React.useState(false)

  React.useEffect(() => {
    const onScroll = () => {
      const { clientHeight, scrollHeight, scrollTop } = getSiteScrollMetrics()
      const docHeight = scrollHeight - clientHeight
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0)

      if (navbarThreshold !== undefined) {
        setHasScrolledPastNavbar(scrollTop > navbarThreshold)
      }
    }

    onScroll()
    return addSiteScrollListener(onScroll, { passive: true })
  }, [navbarThreshold])

  return { hasScrolledPastNavbar, progress }
}
