"use client"

import { useEffect, useState } from "react"

export type OutlineDepth = 1 | 2 | 3

export interface OutlineItem {
  id: string
  text: string
  depth: OutlineDepth
}

const OUTLINE_HEADING_SELECTOR = "main h2[id], main h3[id], main h4[id]"

function getOutlineDepth(heading: Element): OutlineDepth {
  if (heading.tagName === "H3") return 2
  if (heading.tagName === "H4") return 3
  return 1
}

function scanHeadings(): OutlineItem[] {
  if (typeof document === "undefined") return []
  const headings = document.querySelectorAll(OUTLINE_HEADING_SELECTOR)
  if (headings.length === 0) return []

  const outlineItems: OutlineItem[] = []
  const seenIds = new Map<string, number>()
  headings.forEach((heading) => {
    if (heading.id && heading.textContent) {
      const clone = heading.cloneNode(true) as Element
      clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
        el.remove()
      })
      const text = clone.textContent?.replace(/^#\s*/, "") ?? ""

      let uniqueId = heading.id
      const count = seenIds.get(heading.id) ?? 0
      if (count > 0) {
        uniqueId = `${heading.id}-${count}`
      }
      seenIds.set(heading.id, count + 1)

      outlineItems.push({
        id: uniqueId,
        text,
        depth: getOutlineDepth(heading),
      })
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
