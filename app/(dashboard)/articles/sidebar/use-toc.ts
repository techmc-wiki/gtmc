"use client"

import { useEffect, useRef, useState } from "react"

export interface TocItem {
  id: string
  text: string
}

function scanHeadings(): TocItem[] {
  if (typeof document === "undefined") return []
  const headings = document.querySelectorAll("main h2")
  if (headings.length === 0) return []

  const tocItems: TocItem[] = []
  headings.forEach((heading) => {
    if (heading.id && heading.textContent) {
      const clone = heading.cloneNode(true) as Element
      clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
        el.remove()
      })
      const text = clone.textContent?.replace(/^#\s*/, "") ?? ""
      tocItems.push({ id: heading.id, text })
    }
  })
  return tocItems
}

function getInitialToc(): TocItem[] {
  return typeof document !== "undefined" ? scanHeadings() : []
}

export function useToc(pathname: string): TocItem[] {
  const [toc, setToc] = useState<TocItem[]>(getInitialToc)

  useEffect(() => {
    if (typeof document === "undefined") return

    // Initially clear or set to whatever is in DOM right now
    // (If Next.js hasn't updated DOM yet, this might be old headings,
    // but the observer will catch the new ones).
    setToc(scanHeadings())

    const observer = new MutationObserver(() => {
      setToc(scanHeadings())
    })

    const main = document.querySelector("main") || document.body
    observer.observe(main, { childList: true, subtree: true })

    // Observe for a generous amount of time to catch all suspense rendering
    const timeout = setTimeout(() => observer.disconnect(), 10000)

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [pathname])

  return toc
}
