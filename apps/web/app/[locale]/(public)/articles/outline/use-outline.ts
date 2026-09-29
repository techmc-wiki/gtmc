"use client"

import { useEffect, useState, type RefObject } from "react"
import type { ProximitySection } from "@/components/ui/shadcn/proximity-sidebar"

export type OutlineItem = ProximitySection
const EMPTY_OUTLINE: OutlineItem[] = []

export function useOutline(root: RefObject<HTMLElement | null>, pathname: string): OutlineItem[] {
  const [outline, setOutline] = useState({ pathname, items: EMPTY_OUTLINE })

  useEffect(() => {
    const container = root.current
    if (!container) return
    let frame = 0

    const scan = () => {
      frame = 0
      // Next.js keeps previous pages mounted inside hidden Activity boundaries.
      const article = [...container.querySelectorAll<HTMLElement>("[data-article-content]")]
        .find((element) => element.checkVisibility())
      const seen = new Set<string>()
      const next: OutlineItem[] = []
      article?.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id]").forEach((element) => {
        if (seen.has(element.id)) return
        seen.add(element.id)
        const clone = element.cloneNode(true) as HTMLElement
        clone.querySelectorAll('[aria-hidden="true"], button').forEach((el) => el.remove())
        const label = clone.textContent?.replace(/^#\s*/, "").trim()
        if (label) next.push({ id: element.id, label, level: Number(element.tagName[1]), element })
      })
      setOutline((previous) => previous.pathname === pathname && previous.items.length === next.length && previous.items.every((item, index) =>
        item.element === next[index].element && item.label === next[index].label && item.level === next[index].level
      ) ? previous : { pathname, items: next })
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(scan)
    }
    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(container, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [root, pathname])

  return outline.pathname === pathname ? outline.items : EMPTY_OUTLINE
}
