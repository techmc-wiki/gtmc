"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { TreeNode } from "./tree-node"

export function useScrollToActive({
  tree,
  pathname,
  mounted,
  expandedFolders,
  expandedFoldersRef,
  setExpandedFolders,
  scrollContainerRef,
  setIsFileExpanded,
}: {
  tree: TreeNode[]
  pathname: string
  mounted: boolean
  expandedFolders: Set<string>
  expandedFoldersRef: React.RefObject<Set<string>>
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  setIsFileExpanded: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [highlightActive, setHighlightActive] = useState(false)
  const activeItemRef = useRef<HTMLLIElement>(null)
  const folderGridRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const locatePendingRef = useRef(false)
  const pendingExpandIdsRef = useRef<string[]>([])
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        clearTimeout(highlightTimerRef.current)
      }
    }
  }, [])

  const getEffectivePathname = useCallback(() => {
    if (pathname === "/articles" || pathname === "/articles/" || pathname === "/") {
      return "/articles/Preface"
    }
    return pathname
  }, [pathname])

  const findItemAndParents = useCallback(
    (
      items: TreeNode[],
      target: string,
      parents: string[] = []
    ): { item: TreeNode | null; parentIds: string[] } => {
      const decodedTarget = decodeURIComponent(target)
      for (const item of items) {
        const slug = `/articles/${item.slug}`
        const decodedSlug = decodeURIComponent(slug)
        if (decodedSlug === decodedTarget || `${decodedSlug}/` === decodedTarget) {
          return { item, parentIds: parents }
        }
        if (item.children?.length > 0) {
          const result = findItemAndParents(item.children, target, [...parents, item.id])
          if (result.item) return result
        }
      }
      return { item: null, parentIds: [] }
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
    if (highlightTimerRef.current !== null) {
      clearTimeout(highlightTimerRef.current)
    }
    highlightTimerRef.current = setTimeout(() => {
      setHighlightActive(false)
      highlightTimerRef.current = null
    }, 2000)
  }, [scrollContainerRef])

  const expandAndScroll = useCallback(
    (parentIds: string[]) => {
      const needExpand = parentIds.filter((id) => !expandedFoldersRef.current.has(id))
      if (needExpand.length === 0) {
        scrollActiveItem()
        return
      }

      setExpandedFolders((prev) => {
        const next = new Set(prev)
        needExpand.forEach((id) => next.add(id))
        return next
      })
      pendingExpandIdsRef.current = needExpand
      locatePendingRef.current = true
    },
    [expandedFoldersRef, scrollActiveItem, setExpandedFolders]
  )

  useEffect(() => {
    if (!locatePendingRef.current) return

    const ids = pendingExpandIdsRef.current
    const allGrids = folderGridRefs.current
    const watchGrids = ids
      .map((id) => allGrids.get(id))
      .filter((el): el is HTMLDivElement => !!el)

    if (watchGrids.length === 0) {
      locatePendingRef.current = false
      scrollActiveItem()
      return
    }

    let remaining = watchGrids.length
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "grid-template-rows") return
      remaining--
      if (remaining <= 0) {
        locatePendingRef.current = false
        pendingExpandIdsRef.current = []
        scrollActiveItem()
        watchGrids.forEach((el) => el.removeEventListener("transitionend", onEnd))
      }
    }

    watchGrids.forEach((el) => el.addEventListener("transitionend", onEnd))
    return () => {
      watchGrids.forEach((el) => el.removeEventListener("transitionend", onEnd))
    }
  }, [expandedFolders, scrollActiveItem])

  useEffect(() => {
    if (!mounted || tree.length === 0) return
    const { parentIds } = findItemAndParents(tree, getEffectivePathname())
    expandAndScroll(parentIds)
  }, [
    pathname,
    mounted,
    tree,
    findItemAndParents,
    getEffectivePathname,
    expandAndScroll,
  ])

  const scrollToCurrent = useCallback(() => {
    const { parentIds } = findItemAndParents(tree, getEffectivePathname())
    if (window.scrollY >= window.innerHeight / 2) {
      setIsFileExpanded(true)
    }
    expandAndScroll(parentIds)
  }, [tree, findItemAndParents, getEffectivePathname, setIsFileExpanded, expandAndScroll])

  return {
    activeItemRef,
    folderGridRefs,
    highlightActive,
    getEffectivePathname,
    scrollToCurrent,
  }
}
