"use client"

import { useEffect, useState } from "react"

export interface OutlineItem {
  id: string
  text: string
}

function scanHeadings(): OutlineItem[] {
  if (typeof document === "undefined") return []
  const headings = document.querySelectorAll("main h2")
  if (headings.length === 0) return []

  const outlineItems: OutlineItem[] = []
  headings.forEach((heading) => {
    if (heading.id && heading.textContent) {
      const clone = heading.cloneNode(true) as Element
      clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
        el.remove()
      })
      const text = clone.textContent?.replace(/^#\s*/, "") ?? ""
      outlineItems.push({ id: heading.id, text })
    }
  })
  return outlineItems
}

export function useOutline(pathname: string): OutlineItem[] {
  const [outline, setOutline] = useState<OutlineItem[]>([])

  useEffect(() => {
    if (typeof document === "undefined") return

    void pathname

    const frame = requestAnimationFrame(() => {
      setOutline(scanHeadings())
    })

    const observer = new MutationObserver(() => {
      setOutline(scanHeadings())
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

  return outline
}
