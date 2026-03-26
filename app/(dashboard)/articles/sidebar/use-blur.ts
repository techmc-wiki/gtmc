"use client"

import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import type { TocItem } from "./use-toc"
import type { TreeNode } from "./tree-node"

export function useBlur({
  internalScroll,
  scrollContainerRef,
  pathname,
  tree,
  expandedFolders,
  toc,
  isFileExpanded,
  highlightActive,
}: {
  internalScroll: boolean
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  pathname: string
  tree: TreeNode[]
  expandedFolders: Set<string>
  toc: TocItem[]
  isFileExpanded: boolean
  highlightActive: boolean
}): { scheduleBottomRowBlurSync: () => void } {
  const blurFrameRef = useRef<number | null>(null)

  const syncBottomRowBlur = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const rows = container.querySelectorAll<HTMLElement>(
      'li[data-sidebar-row="1"]'
    )
    const blurZoneRect = container.getBoundingClientRect()
    const blurZoneHeight = 32
    const blurZoneTop = blurZoneRect.bottom - blurZoneHeight

    rows.forEach((row) => {
      const rowRect = row.getBoundingClientRect()
      const overlapTop = Math.max(rowRect.top, blurZoneTop)
      const overlapBottom = Math.min(rowRect.bottom, blurZoneRect.bottom)
      const overlapHeight = overlapBottom - overlapTop
      const distBottomLine = blurZoneRect.bottom - rowRect.top

      if (rowRect.y > blurZoneRect.bottom) {
        row.style.filter = "blur(3px)"
        row.style.opacity = "0.15"
        return
      }

      if (overlapHeight <= 0) {
        row.style.filter = ""
        row.style.opacity = ""
        return
      }

      const ratio = Math.max(
        0,
        Math.min(
          1,
          rowRect.top > blurZoneTop - blurZoneHeight * 0.8
            ? overlapHeight / blurZoneHeight
            : (0.5 - distBottomLine / rowRect.height) * 2
        )
      )
      const blur = 0.2 + ratio * 2.8
      const opacity = 1 - ratio * 0.85
      row.style.filter = `blur(${blur.toFixed(3)}px)`
      row.style.opacity = `${opacity.toFixed(3)}`
    })
  }, [scrollContainerRef])

  const scheduleBottomRowBlurSync = useCallback(() => {
    if (blurFrameRef.current !== null) return
    blurFrameRef.current = window.requestAnimationFrame(() => {
      blurFrameRef.current = null
      syncBottomRowBlur()
    })
  }, [syncBottomRowBlur])

  const animLoopRef = useRef<number | null>(null)
  const animLoopEndRef = useRef<number>(0)

  const syncForDuration = useCallback(
    (ms: number) => {
      if (animLoopRef.current !== null) {
        window.cancelAnimationFrame(animLoopRef.current)
      }
      animLoopEndRef.current = performance.now() + ms
      const loop = () => {
        syncBottomRowBlur()
        if (performance.now() < animLoopEndRef.current) {
          animLoopRef.current = window.requestAnimationFrame(loop)
        } else {
          animLoopRef.current = null
        }
      }
      animLoopRef.current = window.requestAnimationFrame(loop)
    },
    [syncBottomRowBlur]
  )

  useLayoutEffect(() => {
    if (!internalScroll) return
    const container = scrollContainerRef.current
    if (!container) return

    const onScroll = () => scheduleBottomRowBlurSync()
    const onResize = () => scheduleBottomRowBlurSync()

    container.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onResize)

    const resizeObserver = new ResizeObserver(() => {
      scheduleBottomRowBlurSync()
    })
    resizeObserver.observe(container)
    scheduleBottomRowBlurSync()

    return () => {
      container.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
      resizeObserver.disconnect()

      if (blurFrameRef.current !== null) {
        window.cancelAnimationFrame(blurFrameRef.current)
        blurFrameRef.current = null
      }

      if (animLoopRef.current !== null) {
        window.cancelAnimationFrame(animLoopRef.current)
        animLoopRef.current = null
      }

      const rows = container.querySelectorAll<HTMLElement>(
        'li[data-sidebar-row="1"]'
      )
      rows.forEach((row) => {
        row.style.filter = ""
        row.style.opacity = ""
      })
    }
  }, [internalScroll, scheduleBottomRowBlurSync, scrollContainerRef])

  useEffect(() => {
    if (!internalScroll) return
    syncForDuration(300)
  }, [
    internalScroll,
    pathname,
    tree,
    expandedFolders,
    toc,
    isFileExpanded,
    highlightActive,
    syncForDuration,
  ])

  return { scheduleBottomRowBlurSync }
}
