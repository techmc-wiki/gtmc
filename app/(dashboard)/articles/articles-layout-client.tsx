"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import { createPortal } from "react-dom"
import { SidebarClient, type SidebarClientHandle } from "./sidebar-client"
import { SidebarActions } from "./sidebar/actions"
import { MobileTreeCard } from "./mobile-tree-card"
import {
  ScanConfirmOverlay,
  SectionRail,
  SegmentedBar,
} from "../features/loading-shell-primitives"

interface TreeNode {
  id: string
  title: string
  slug: string
  isFolder: boolean
  parentId: string | null
  children: TreeNode[]
}

interface ArticlesLayoutProps {
  children: React.ReactNode
  tree: TreeNode[]
}

function TreeLoadingPlaceholder() {
  return (
    <div
      className="
        relative h-full animate-tree-drop-in overflow-hidden border guide-line
        bg-white/80 px-3 py-4
        motion-reduce:animate-none
        md:min-h-160 md:px-4 md:py-5
      "
      style={{
        animation: "tree-drop-in 1.05s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
      aria-hidden="true">
      <ScanConfirmOverlay className="opacity-40" />
      <SectionRail
        label="TREE_BOOTSTRAP"
        className="mb-3 text-[10px] opacity-75"
      />

      <div className="space-y-6 pr-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="size-1 bg-tech-main/45" />
            <SegmentedBar opacity="high" className="h-4 w-4/5" />
          </div>

          <div className="space-y-3 border-l guide-line pl-3">
            <div className="flex items-center gap-2">
              <span className="h-px w-2 bg-tech-main/40" />
              <SegmentedBar opacity="medium" className="h-3.5 w-3/4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="h-px w-2 bg-tech-main/40" />
              <SegmentedBar opacity="medium" className="h-3.5 w-2/3" />
            </div>

            <div className="ml-2 space-y-3 border-l guide-line pl-3">
              <div className="flex items-center gap-2">
                <span className="size-1 rounded-full bg-tech-main/35" />
                <SegmentedBar opacity="low" className="h-3 w-3/5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="size-1 rounded-full bg-tech-main/35" />
                <SegmentedBar opacity="low" className="h-3 w-2/5" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="size-1 bg-tech-main/45" />
            <SegmentedBar opacity="high" className="h-4 w-2/3" />
          </div>

          <div className="space-y-3 border-l guide-line pl-3">
            <div className="flex items-center gap-2">
              <span className="h-px w-2 bg-tech-main/40" />
              <SegmentedBar opacity="medium" className="h-3.5 w-3/5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="h-px w-2 bg-tech-main/40" />
              <SegmentedBar opacity="low" className="h-3.5 w-1/3" />
            </div>
          </div>
        </div>

        <div className="space-y-3 border-l guide-line pl-3">
          <div className="flex items-center gap-2">
            <span className="h-px w-2 bg-tech-main/35" />
            <SegmentedBar opacity="medium" className="h-3.5 w-1/2" />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-px w-2 bg-tech-main/35" />
            <SegmentedBar opacity="low" className="h-3.5 w-2/5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-px w-2 bg-tech-main/35" />
            <SegmentedBar opacity="low" className="h-3.5 w-1/3" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ArticlesLayoutClient({ children, tree }: ArticlesLayoutProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isStuck, setIsStuck] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [treeData, setTreeData] = useState<TreeNode[]>(tree)
  const [isTreeLoading, setIsTreeLoading] = useState(tree.length === 0)
  const [buttonTop, setButtonTop] = useState(64)
  const pathname = usePathname()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const desktopSidebarRef = useRef<SidebarClientHandle>(null)

  useEffect(() => {
    if (pathname) {
      setIsOpen(false)
    }
  }, [pathname])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isStuck) {
      setIsOpen(false)
    }
  }, [isStuck])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting)
      },
      {
        threshold: 0,
        rootMargin: "-64px 0px 0px 0px",
      }
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const updatePosition = () => {
      if (buttonContainerRef.current) {
        const rect = buttonContainerRef.current.getBoundingClientRect()
        setButtonTop(Math.max(64, rect.top))
      }
    }

    updatePosition()
    window.addEventListener("scroll", updatePosition, { passive: true })
    window.addEventListener("resize", updatePosition, { passive: true })

    return () => {
      window.removeEventListener("scroll", updatePosition)
      window.removeEventListener("resize", updatePosition)
    }
  }, [isMounted])

  useEffect(() => {
    if (tree.length > 0) {
      setTreeData(tree)
      setIsTreeLoading(false)
      return
    }

    const controller = new AbortController()
    let active = true

    const loadTree = async () => {
      try {
        setIsTreeLoading(true)
        const response = await fetch("/api/articles/tree", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as TreeNode[]
        if (active && Array.isArray(payload)) {
          setTreeData(payload)
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }
      } finally {
        if (active) {
          setIsTreeLoading(false)
        }
      }
    }

    void loadTree()

    return () => {
      active = false
      controller.abort()
    }
  }, [tree, tree.length])

  const showTreePlaceholder = isTreeLoading && treeData.length === 0

  const treeContent = (
    <div
      className={`
        w-full pb-4 font-mono text-[15px] wrap-break-word
        [&_li]:mt-1.5
        [&_ul]:list-none
        [&_ul_ul]:mt-1.5 [&_ul_ul]:mb-3 [&_ul_ul]:border-l [&_ul_ul]:guide-line
        [&_ul_ul]:pl-3
        [&>ul]:pl-0
        ${showTreePlaceholder ? "h-full min-h-full pb-0" : ""}
      `}
      aria-busy={showTreePlaceholder}>
      {showTreePlaceholder ? (
        <div className="h-full min-h-full pr-4">
          <TreeLoadingPlaceholder />
        </div>
      ) : (
        <SidebarClient tree={treeData} onNavigate={() => setIsOpen(false)} />
      )}
    </div>
  )

  return (
    <div
      className="
        relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-full flex-col
        isolate
        md:flex-row
      ">
      <div
        ref={sentinelRef}
        className="
          h-0 w-full
          md:hidden
        "
        aria-hidden="true"
      />
      <div
        ref={buttonContainerRef}
        className="h-0 w-full md:hidden"
        aria-hidden="true"
      />

      {isMounted &&
        createPortal(
          <div
            className="fixed left-0 right-0 z-30 md:hidden"
            style={{ top: `${buttonTop}px` }}>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                  cursor-pointer overflow-hidden bg-white/70
                  font-mono text-xs font-bold tracking-[0.15em] text-tech-main
                  backdrop-blur-sm transition-all duration-500 ease-out
                  hover:bg-tech-main/5
                  ${
                    isStuck
                      ? "mt-4 mr-4 min-h-10 w-20 border border-tech-main/40 px-4 py-2 shadow-sm"
                      : "min-h-12 w-full border-b border-tech-main/40 px-4"
                  }
                `}
                aria-label="Toggle article tree"
                aria-expanded={isOpen}
                data-testid="mobile-tree-toggle">
                <span className="relative flex w-full items-center justify-center">
                  <span
                    className={`
                      absolute inset-0 flex items-center justify-between
                      transition-opacity duration-300
                      ${isStuck ? "opacity-0" : "opacity-100"}
                    `}>
                    <span>Table of Contents</span>
                    <span className="text-sm font-bold">
                      {isOpen ? "▼" : "▶"}
                    </span>
                  </span>
                  <span
                    className={`
                      transition-opacity duration-300
                      ${isStuck ? "opacity-100" : "opacity-0"}
                    `}>
                    ToC
                  </span>
                </span>
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Mobile floating tree card */}
      <MobileTreeCard
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        isFloating={isStuck}>
        {treeContent}
      </MobileTreeCard>

      {/* Desktop sidebar */}
      <aside
        className="
          hidden w-64 shrink-0 border-r guide-line
          md:block
          lg:w-80
        ">
        <div
          className="
            sticky top-20 flex flex-col justify-center
            hover:z-20
            sm:top-26 sm:h-[calc(100vh-128px)]
            lg:top-28 lg:h-[calc(100vh-144px)]
          ">
          <div
            className="
              group relative flex max-h-4/5 min-h-0 flex-1 flex-col
              overflow-visible border-b guide-line text-tech-main
              md:px-4 md:py-2
            ">
            <div className="flex shrink-0 flex-col">
              <div
                className="
                  group/title flex shrink-0 items-center justify-between
                  border-b guide-line px-4 pb-2
                ">
                <div
                  className="
                    flex items-center font-mono text-xs font-bold
                    tracking-tech-wide text-tech-main/60 uppercase
                  ">
                  <span
                    className="
                      mr-2 inline-block size-1.5 animate-pulse bg-tech-main/60
                    "
                  />
                  SYS.DIR_TREE
                </div>
              </div>

              <SidebarActions
                internalScroll
                onCreate={() => desktopSidebarRef.current?.openCreateModal()}
                onCollapseAll={(e) => desktopSidebarRef.current?.collapseAll(e)}
                onLocate={() => desktopSidebarRef.current?.scrollToCurrent()}
              />
            </div>

            {showTreePlaceholder ? (
              <div
                className="
                  custom-left-scrollbar h-full min-h-0 flex-1 overflow-y-auto
                ">
                <TreeLoadingPlaceholder />
              </div>
            ) : (
              <SidebarClient
                ref={desktopSidebarRef}
                tree={treeData}
                internalScroll
                scrollClass="pr-4"
                hideActions
              />
            )}
          </div>
        </div>
      </aside>

      <main
        className="
          relative min-w-0 flex-1 overflow-x-hidden border-l border-transparent
          py-6
          md:max-w-2xl md:pl-10
          lg:max-w-3xl lg:pl-10
        ">
        {children}
      </main>
    </div>
  )
}
