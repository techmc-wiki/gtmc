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
  const prevPathnameRef = useRef(pathname)

  useEffect(() => {
    if (prevPathnameRef.current === pathname) return
    prevPathnameRef.current = pathname

    if (typeof document === "undefined") return

    const observer = new MutationObserver(() => {
      const newItems = scanHeadings()
      if (newItems.length > 0) {
        setToc(newItems)
        observer.disconnect()
      }
    })

    const main = document.querySelector("main")
    if (main) {
      observer.observe(main, { childList: true, subtree: true })
    }

    const timeout = setTimeout(() => observer.disconnect(), 5000)

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [pathname])

  return toc
}
