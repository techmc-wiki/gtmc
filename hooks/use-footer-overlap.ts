"use client"

import * as React from "react"
import { addSiteScrollListener } from "@/hooks/site-scroll-root"

interface UseFooterOverlapOptions {
  selector?: string
  threshold?: number
}

export function useFooterOverlap({
  selector = "footer",
  threshold = 144,
}: UseFooterOverlapOptions = {}) {
  const [isOverlapping, setIsOverlapping] = React.useState(false)
  const overlapRef = React.useRef(false)

  React.useEffect(() => {
    const update = () => {
      const footer = document.querySelector<HTMLElement>(selector)
      const rect = footer?.getBoundingClientRect()
      const next = Boolean(rect && rect.top <= threshold && rect.bottom > 0)

      if (next !== overlapRef.current) {
        overlapRef.current = next
        setIsOverlapping(next)
      }
    }

    update()
    const removeSiteScrollListener = addSiteScrollListener(update, {
      passive: true,
    })
    window.addEventListener("resize", update)

    return () => {
      removeSiteScrollListener()
      window.removeEventListener("resize", update)
    }
  }, [selector, threshold])

  return isOverlapping
}
