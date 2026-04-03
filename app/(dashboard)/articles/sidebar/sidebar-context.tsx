"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useActiveHeading } from "./use-active-heading"
import { useExpandedFolders } from "./use-expanded-folders"
import { useToc, type TocItem } from "./use-toc"
import type { TreeNode } from "@/types/sidebar-tree"

interface SidebarProviderProps {
  tree: TreeNode[]
  children: React.ReactNode
}

interface SidebarContextValue {
  expandedFolders: Set<string>
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>
  expandedFoldersRef: React.RefObject<Set<string>>
  mounted: boolean
  isFolderExpanded: (id: string) => boolean
  toggleFolder: (id: string) => void

  isFileExpanded: boolean
  setIsFileExpanded: React.Dispatch<React.SetStateAction<boolean>>
  toggleFileExpanded: () => void

  highlightActive: boolean
  setHighlightActive: React.Dispatch<React.SetStateAction<boolean>>

  toc: TocItem[]
  activeHeadingId: string | null

  tree: TreeNode[]
  effectivePath: string

  activeItemRef: React.RefObject<HTMLLIElement | null>
  folderGridRefs: React.RefObject<Map<string, HTMLDivElement>>
  scrollContainerRef: React.RefObject<HTMLDivElement | null>

  collapseAll: () => void
  scrollToCurrentRef: React.MutableRefObject<() => void>
  scrollToCurrent: () => void
  setScrollToCurrent: (fn: () => void) => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ tree, children }: SidebarProviderProps) {
  const pathname = usePathname()

  const {
    expandedFolders,
    setExpandedFolders,
    expandedFoldersRef,
    mounted,
    isFolderExpanded,
  } = useExpandedFolders()

  const toc = useToc(pathname)
  const activeHeadingId = useActiveHeading(toc, pathname)

  const [isFileExpanded, setIsFileExpanded] = React.useState(false)
  const [highlightActive, setHighlightActive] = React.useState(false)

  const activeItemRef = React.useRef<HTMLLIElement | null>(null)
  const folderGridRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const scrollToCurrentRef = React.useRef<() => void>(() => {})

  React.useEffect(() => {
    if (pathname) {
      setIsFileExpanded(true)
    }
  }, [pathname])

  const effectivePath =
    pathname === "/articles" || pathname === "/articles/" || pathname === "/"
      ? "/articles/preface"
      : pathname

  const toggleFolder = React.useCallback(
    (id: string) => {
      setExpandedFolders((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    },
    [setExpandedFolders]
  )

  const toggleFileExpanded = React.useCallback(() => {
    setIsFileExpanded((prev) => !prev)
  }, [])

  const collapseAll = React.useCallback(() => {
    setExpandedFolders(new Set())
    setIsFileExpanded(false)
  }, [setExpandedFolders])

  const setScrollToCurrent = React.useCallback((fn: () => void) => {
    scrollToCurrentRef.current = fn
  }, [])

  const scrollToCurrent = React.useCallback(() => {
    scrollToCurrentRef.current()
  }, [])

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      expandedFolders,
      setExpandedFolders,
      expandedFoldersRef,
      mounted,
      isFolderExpanded,
      toggleFolder,
      isFileExpanded,
      setIsFileExpanded,
      toggleFileExpanded,
      highlightActive,
      setHighlightActive,
      toc,
      activeHeadingId,
      tree,
      effectivePath,
      activeItemRef,
      folderGridRefs,
      scrollContainerRef,
      collapseAll,
      scrollToCurrentRef,
      scrollToCurrent,
      setScrollToCurrent,
    }),
    [
      expandedFolders,
      setExpandedFolders,
      expandedFoldersRef,
      mounted,
      isFolderExpanded,
      toggleFolder,
      isFileExpanded,
      toggleFileExpanded,
      highlightActive,
      toc,
      activeHeadingId,
      tree,
      effectivePath,
      collapseAll,
      scrollToCurrent,
      setScrollToCurrent,
    ]
  )

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  )
}

export function useSidebarContext(): SidebarContextValue {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebarContext must be used within SidebarProvider")
  }
  return context
}
