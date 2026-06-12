"use client"

import * as React from "react"

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
      const scrollTop = window.scrollY
      const docHeight = document.body.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0)

      if (navbarThreshold !== undefined) {
        setHasScrolledPastNavbar(scrollTop > navbarThreshold)
      }
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [navbarThreshold])

  return { hasScrolledPastNavbar, progress }
}
