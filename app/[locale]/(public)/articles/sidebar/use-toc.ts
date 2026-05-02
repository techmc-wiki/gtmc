"use client"

import { useEffect, useState } from "react"

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

export function useToc(pathname: string): TocItem[] {
  const [toc, setToc] = useState<TocItem[]>([])

  useEffect(() => {
    if (typeof document === "undefined") return

    void pathname

    const frame = requestAnimationFrame(() => {
      setToc(scanHeadings())
    })

    const observer = new MutationObserver(() => {
      setToc(scanHeadings())
    })

    const main = document.querySelector("main") || document.body
    observer.observe(main, { childList: true, subtree: true })

    const timeout = setTimeout(() => observer.disconnect(), 10000)

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
      cancelAnimationFrame(frame)
    }
  }, [pathname])

  return toc
}
