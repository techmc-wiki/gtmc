"use client"

import * as React from "react"
import { usePathname } from "@/i18n/navigation"
import { useExpandedFolders } from "../chapter-nav/use-expanded-folders"
import { useActiveHeading } from "../outline/use-active-heading"
import { useOutline, type OutlineItem } from "../outline/use-outline"
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"

interface ReaderNavigationProviderProps {
  tree: ChapterNavNode[]
  children: React.ReactNode
}

interface ReaderNavigationContextValue {
  expandedFolders: Set<string>
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>
  expandedFoldersRef: React.RefObject<Set<string>>
  mounted: boolean
  isFolderExpanded: (id: string) => boolean
  toggleFolder: (id: string) => void

  highlightActive: boolean
  setHighlightActive: React.Dispatch<React.SetStateAction<boolean>>

  outline: OutlineItem[]
  activeHeadingId: string | null

  tree: ChapterNavNode[]
  effectivePath: string

  activeItemRef: React.RefObject<HTMLLIElement | null>
  folderGridRefs: React.RefObject<Map<string, HTMLDivElement>>
  scrollContainerRef: React.RefObject<HTMLDivElement | null>

  collapseAll: () => void
  scrollToCurrentRef: React.MutableRefObject<() => void>
  scrollToCurrent: () => void
  setScrollToCurrent: (fn: () => void) => void
}

const ReaderNavigationContext = React.createContext<ReaderNavigationContextValue | null>(null)

export function ReaderNavigationProvider({ tree, children }: ReaderNavigationProviderProps) {
  const pathname = usePathname()

  const {
    expandedFolders,
    setExpandedFolders,
    expandedFoldersRef,
    mounted,
    isFolderExpanded,
  } = useExpandedFolders()

  const outline = useOutline(pathname)
  const activeHeadingId = useActiveHeading(outline, pathname)

  const [highlightActive, setHighlightActive] = React.useState(false)

  const activeItemRef = React.useRef<HTMLLIElement | null>(null)
  const folderGridRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const scrollToCurrentRef = React.useRef<() => void>(() => {})

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

  const collapseAll = React.useCallback(() => {
    setExpandedFolders(new Set())
  }, [setExpandedFolders])

  const setScrollToCurrent = React.useCallback((fn: () => void) => {
    scrollToCurrentRef.current = fn
  }, [])

  const scrollToCurrent = React.useCallback(() => {
    scrollToCurrentRef.current()
  }, [])

  const value = React.useMemo<ReaderNavigationContextValue>(
    () => ({
      expandedFolders,
      setExpandedFolders,
      expandedFoldersRef,
      mounted,
      isFolderExpanded,
      toggleFolder,
      highlightActive,
      setHighlightActive,
      outline,
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
      highlightActive,
      outline,
      activeHeadingId,
      tree,
      effectivePath,
      collapseAll,
      scrollToCurrent,
      setScrollToCurrent,
    ]
  )

  return (
    <ReaderNavigationContext.Provider value={value}>{children}</ReaderNavigationContext.Provider>
  )
}

export function useReaderNavigation(): ReaderNavigationContextValue {
  const context = React.use(ReaderNavigationContext)
  if (!context) {
    throw new Error("useReaderNavigation must be used within ReaderNavigationProvider")
  }
  return context
}
