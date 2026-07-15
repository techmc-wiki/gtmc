import React, { useCallback, useEffect, useRef } from "react"
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"
import { articleUrl } from "@/lib/articles/url"

const HIGHLIGHT_TIMEOUT_MS = 2000
const LOCATE_FALLBACK_MS = 600

type LocateState =
  | { phase: "idle" }
  | {
      phase: "expanding"
      pendingIds: string[]
      fallbackTimer: ReturnType<typeof setTimeout>
    }

interface LocateCurrentOptions {
  tree: ChapterNavNode[]
  effectivePath: string
  mounted: boolean
  expandedFolders: Set<string>
  expandedFoldersRef: React.RefObject<Set<string>>
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  activeItemRef: React.RefObject<HTMLLIElement | null>
  folderGridRefs: React.RefObject<Map<string, HTMLDivElement>>
  setHighlightActive: React.Dispatch<React.SetStateAction<boolean>>
}

function findParentIds(items: ChapterNavNode[], target: string): string[] {
  const decodedTarget = decodeURIComponent(target).toLowerCase()

  const walk = (
    nodes: ChapterNavNode[],
    parents: string[] = []
  ): string[] | null => {
    for (const item of nodes) {
      if (item.children?.length) {
        const result = walk(item.children, [...parents, item.id])
        if (result) return result
      }

      const slug = decodeURIComponent(articleUrl(item.slug)).toLowerCase()
      if (slug === decodedTarget || `${slug}/` === decodedTarget) {
        return parents
      }
    }

    return null
  }

  return walk(items) ?? []
}

export function useLocateCurrent({
  tree,
  effectivePath,
  mounted,
  expandedFolders,
  expandedFoldersRef,
  setExpandedFolders,
  scrollContainerRef,
  activeItemRef,
  folderGridRefs,
  setHighlightActive,
}: LocateCurrentOptions) {
  const locateStateRef = useRef<LocateState>({ phase: "idle" })
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transitionCleanupRef = useRef<(() => void) | null>(null)

  const clearHighlightTimer = useCallback(() => {
    if (highlightTimerRef.current !== null) {
      clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = null
    }
  }, [])

  const clearTransitionListeners = useCallback(() => {
    if (transitionCleanupRef.current !== null) {
      transitionCleanupRef.current()
      transitionCleanupRef.current = null
    }
  }, [])

  const resetLocateState = useCallback(() => {
    const state = locateStateRef.current
    if (state.phase === "expanding") {
      clearTimeout(state.fallbackTimer)
    }
    clearTransitionListeners()
    locateStateRef.current = { phase: "idle" }
  }, [clearTransitionListeners])

  useEffect(
    () => () => {
      clearHighlightTimer()
      resetLocateState()
    },
    [clearHighlightTimer, resetLocateState]
  )

  const scrollActiveItem = useCallback(() => {
    const item = activeItemRef.current
    const container = scrollContainerRef.current
    if (!item) return

    if (container) {
      const ir = item.getBoundingClientRect()
      const cr = container.getBoundingClientRect()
      const top = ir.top - cr.top + container.scrollTop - cr.height / 4
      container.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
    } else {
      item.scrollIntoView({ block: "start", behavior: "smooth" })
    }

    setHighlightActive(true)
    clearHighlightTimer()
    highlightTimerRef.current = setTimeout(() => {
      setHighlightActive(false)
      highlightTimerRef.current = null
    }, HIGHLIGHT_TIMEOUT_MS)
  }, [clearHighlightTimer, scrollContainerRef, activeItemRef, setHighlightActive])

  const scrollAndReset = useCallback(() => {
    scrollActiveItem()
    locateStateRef.current = { phase: "idle" }
  }, [scrollActiveItem])

  const finishExpansionAndScroll = useCallback(() => {
    const state = locateStateRef.current
    if (state.phase !== "expanding") return

    clearTimeout(state.fallbackTimer)
    clearTransitionListeners()
    scrollAndReset()
  }, [clearTransitionListeners, scrollAndReset])

  const locateCurrent = useCallback(() => {
    const parentIds = findParentIds(tree, effectivePath)
    const pendingIds = parentIds.filter(
      (id) => !expandedFoldersRef.current.has(id)
    )

    resetLocateState()

    if (pendingIds.length === 0) {
      scrollAndReset()
      return
    }

    setExpandedFolders((prev) => {
      const next = new Set(prev)
      pendingIds.forEach((id) => {
        next.add(id)
      })
      return next
    })

    const fallbackTimer = setTimeout(() => {
      finishExpansionAndScroll()
    }, LOCATE_FALLBACK_MS)

    locateStateRef.current = {
      phase: "expanding",
      pendingIds,
      fallbackTimer,
    }
  }, [
    effectivePath,
    expandedFoldersRef,
    finishExpansionAndScroll,
    resetLocateState,
    scrollAndReset,
    setExpandedFolders,
    tree,
  ])

  useEffect(() => {
    // Run after expanded folder refs have committed to the DOM.
    void expandedFolders

    const state = locateStateRef.current
    if (state.phase !== "expanding") return

    const watchEntries = state.pendingIds
      .map((id) => [id, folderGridRefs.current.get(id)] as const)
      .filter((entry): entry is readonly [string, HTMLDivElement] => !!entry[1])

    if (watchEntries.length === 0) {
      const immediateFinishTimer = window.setTimeout(() => {
        finishExpansionAndScroll()
      }, 0)
      return () => {
        clearTimeout(immediateFinishTimer)
      }
    }

    const remainingIds = new Set(watchEntries.map(([id]) => id))

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "grid-template-rows") return

      const finishedId = watchEntries.find(
        ([, grid]) => grid === event.currentTarget
      )?.[0]
      if (!finishedId || !remainingIds.has(finishedId)) return

      remainingIds.delete(finishedId)
      if (remainingIds.size === 0) {
        finishExpansionAndScroll()
      }
    }

    watchEntries.forEach(([, grid]) => {
      grid.addEventListener("transitionend", onTransitionEnd)
    })

    const cleanup = () => {
      watchEntries.forEach(([, grid]) => {
        grid.removeEventListener("transitionend", onTransitionEnd)
      })
    }

    transitionCleanupRef.current = cleanup

    return () => {
      if (transitionCleanupRef.current === cleanup) {
        cleanup()
        transitionCleanupRef.current = null
      }
    }
  }, [expandedFolders, finishExpansionAndScroll, folderGridRefs])

  useEffect(() => {
    if (!mounted || tree.length === 0) return
    const routeLocateTimer = window.setTimeout(() => {
      locateCurrent()
    }, 0)

    return () => {
      clearTimeout(routeLocateTimer)
    }
  }, [locateCurrent, mounted, tree])

  return locateCurrent
}
