"use client"

import { useEffect, useState } from "react"

export interface TocItem {
  id: string
  text: string
}

export function useToc(pathname: string): TocItem[] {
  const [toc, setToc] = useState<TocItem[]>([])

  useEffect(() => {
    setToc([])

    const scanHeadings = (): boolean => {
      const headings = document.querySelectorAll("main h2")
      if (headings.length === 0) return false

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
      setToc(tocItems)
      return true
    }

    if (scanHeadings()) return

    const observer = new MutationObserver(() => {
      if (scanHeadings()) observer.disconnect()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return toc
}
