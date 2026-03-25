"use client"

import { useEffect, useState } from "react"

export interface TocItem {
  id: string
  text: string
}

export function useToc(pathname: string): TocItem[] {
  const [toc, setToc] = useState<TocItem[]>([])

  useEffect(() => {
    let frameCount = 0
    const maxFrames = 10

    const scanHeadings = () => {
      const headings = document.querySelectorAll("main h2")
      if (headings.length > 0) {
        const tocItems: TocItem[] = []
        headings.forEach((heading) => {
          if (heading.id && heading.textContent) {
            tocItems.push({
              id: heading.id,
              text: heading.textContent.replace(/^#\s*/, ""),
            })
          }
        })
        setToc(tocItems)
        return true
      }
      return false
    }

    const retryWithRAF = () => {
      if (scanHeadings()) return
      if (frameCount < maxFrames) {
        frameCount++
        requestAnimationFrame(retryWithRAF)
      }
    }

    retryWithRAF()
  }, [pathname])

  return toc
}
