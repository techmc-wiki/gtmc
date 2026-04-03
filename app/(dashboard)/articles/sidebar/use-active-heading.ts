"use client"

import { useState, useEffect, useRef } from "react"
import type { TocItem } from "./use-toc"

export function useActiveHeading(
  toc: TocItem[],
  pathname: string
): string | null {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname
      setActiveHeadingId(null)
    }
  }, [pathname])

  useEffect(() => {
    if (!toc || toc.length === 0) {
      setActiveHeadingId(null)
      return
    }

    const headingIds = toc.map((item) => item.id)
    const headingElements = headingIds
      .map((id) => {
        const escapedId = CSS.escape(id)
        return document.querySelector(`main h2#${escapedId}`)
      })
      .filter((el) => el !== null) as Element[]

    if (headingElements.length === 0) {
      setActiveHeadingId(null)
      return
    }

    setActiveHeadingId(headingIds[0] || null)

    const getActiveId = (): string | null => {
      const threshold = window.innerHeight * 0.25
      let activeId: string | null = headingIds[0] || null
      for (let i = 0; i < headingElements.length; i++) {
        const rect = headingElements[i].getBoundingClientRect()
        if (rect.top <= threshold) {
          activeId = headingIds[i]
        } else {
          break
        }
      }
      return activeId
    }

    const onScroll = () => {
      setActiveHeadingId(getActiveId())
    }

    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
    }
  }, [toc])

  return activeHeadingId
}
