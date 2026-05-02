"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { articleUrl } from "@/lib/article-url"
import { HIGHLIGHT_TIMEOUT_MS, LOCATE_FALLBACK_MS } from "./constants"
import type { TreeNode } from "./tree-node"

type LocateState =
  | { phase: "idle" }
  | {
      phase: "expanding"
      pendingIds: string[]
      fallbackTimer: ReturnType<typeof setTimeout>
    }
  | { phase: "scrolling" }

export function useScrollToActive({
  tree,
  pathname,
  mounted,
  expandedFolders,
  expandedFoldersRef,
  setExpandedFolders,
  scrollContainerRef,
  activeItemRef,
  folderGridRefs,
}: {
  tree: TreeNode[]
  pathname: string
  mounted: boolean
  expandedFolders: Set<string>
  expandedFoldersRef: React.RefObject<Set<string>>
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  activeItemRef: React.RefObject<HTMLLIElement | null>
  folderGridRefs: React.RefObject<Map<string, HTMLDivElement>>
}) {
  const [highlightActive, setHighlightActive] = useState(false)
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

  useEffect(() => {
    return () => {
      clearHighlightTimer()
      resetLocateState()
    }
  }, [clearHighlightTimer, resetLocateState])

  const getEffectivePathname = useCallback(() => {
    if (
      pathname === "/" ||
      pathname === "/articles" ||
      pathname === "/articles/"
    ) {
      return "/articles/preface"
    }
    return pathname
  }, [pathname])

  const findItemAndParents = useCallback(
    (
      items: TreeNode[],
      target: string
    ): { item: TreeNode | null; parentIds: string[] } => {
      const decodedTarget = decodeURIComponent(target)

      const walk = (
        nodes: TreeNode[],
        parents: string[] = []
      ): { item: TreeNode | null; parentIds: string[] } => {
        for (const item of nodes) {
          if (item.children?.length) {
            const result = walk(item.children, [...parents, item.id])
            if (result.item) return result
          }

          const slug = articleUrl(item.slug)
          const decodedSlug = decodeURIComponent(slug)
          if (
            decodedSlug.toLowerCase() === decodedTarget.toLowerCase() ||
            `${decodedSlug}/`.toLowerCase() === decodedTarget.toLowerCase()
          ) {
            return { item, parentIds: parents }
          }
        }

        return { item: null, parentIds: [] }
      }

      return walk(items)
    },
    []
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
  }, [clearHighlightTimer, scrollContainerRef, activeItemRef])

  const enterScrollingPhase = useCallback(() => {
    locateStateRef.current = { phase: "scrolling" }
    scrollActiveItem()
    locateStateRef.current = { phase: "idle" }
  }, [scrollActiveItem])

  const finishExpansionAndScroll = useCallback(() => {
    const state = locateStateRef.current
    if (state.phase !== "expanding") return

    clearTimeout(state.fallbackTimer)
    clearTransitionListeners()
    enterScrollingPhase()
  }, [clearTransitionListeners, enterScrollingPhase])

  const runLocateFlow = useCallback(() => {
    const { parentIds } = findItemAndParents(tree, getEffectivePathname())
    const pendingIds = parentIds.filter(
      (id) => !expandedFoldersRef.current.has(id)
    )

    resetLocateState()

    if (pendingIds.length === 0) {
      enterScrollingPhase()
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
    enterScrollingPhase,
    expandedFoldersRef,
    findItemAndParents,
    finishExpansionAndScroll,
    getEffectivePathname,
    resetLocateState,
    setExpandedFolders,
    tree,
  ])

  useEffect(() => {
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
    void pathname

    if (!mounted || tree.length === 0) return
    const routeLocateTimer = window.setTimeout(() => {
      runLocateFlow()
    }, 0)

    return () => {
      clearTimeout(routeLocateTimer)
    }
  }, [pathname, mounted, tree, runLocateFlow])

  const scrollToCurrent = useCallback(() => {
    runLocateFlow()
  }, [runLocateFlow])

  return {
    highlightActive,
    getEffectivePathname,
    scrollToCurrent,
  }
}
