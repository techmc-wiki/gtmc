"use client"

import { useState, useEffect, useRef } from "react"
import type { OutlineItem } from "./use-outline"

interface HeadingEntry {
  id: string
  element: Element
}

function getOutlineHeadingElement(id: string): Element | null {
  if (typeof document === "undefined") return null

  const escapedId = CSS.escape(id)
  return document.querySelector(
    `main h2#${escapedId}, main h3#${escapedId}, main h4#${escapedId}`
  )
}

function getHeadingEntries(toc: OutlineItem[]): HeadingEntry[] {
  return toc.flatMap((item) => {
    const element = getOutlineHeadingElement(item.id)
    return element ? [{ id: item.id, element }] : []
  })
}

function computeInitialActiveHeading(toc: OutlineItem[]): string | null {
  if (!toc || toc.length === 0) return null

  const headingEntries = getHeadingEntries(toc)

  if (headingEntries.length === 0) return null

  const threshold =
    typeof window !== "undefined" ? window.innerHeight * 0.25 : 0
  let activeId: string | null = headingEntries[0]?.id ?? null
  for (const entry of headingEntries) {
    const rect = entry.element.getBoundingClientRect()
    if (rect.top <= threshold) {
      activeId = entry.id
    } else {
      break
    }
  }
  return activeId
}

export function useActiveHeading(
  toc: OutlineItem[],
  pathname: string
): string | null {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(() =>
    computeInitialActiveHeading(toc)
  )
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname
      setActiveHeadingId(computeInitialActiveHeading(toc))
    }
  }, [pathname, toc])

  useEffect(() => {
    if (!toc || toc.length === 0) {
      return
    }

    const getActiveId = (): string | null => {
      const headingEntries = getHeadingEntries(toc)
      if (headingEntries.length === 0) return null

      const threshold = window.innerHeight * 0.25
      let activeId: string | null = headingEntries[0]?.id ?? null

      for (const entry of headingEntries) {
        const rect = entry.element.getBoundingClientRect()
        if (rect.top <= threshold) {
          activeId = entry.id
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
