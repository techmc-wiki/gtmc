"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { usePathname } from "@/i18n/navigation"
import { SidebarClient, type SidebarClientHandle } from "./sidebar-client"
import { SidebarProvider } from "./sidebar/sidebar-context"
import { MobileTreeCard } from "./mobile-tree-card"
import {
  ScanConfirmOverlay,
  SectionRail,
  SegmentedBar,
} from "../features/loading-shell-primitives"
import type { TreeNode } from "@/types/sidebar-tree"
import { useTranslations } from "next-intl"

interface ArticlesLayoutProps {
  children: React.ReactNode
  tree: TreeNode[]
}

interface SidebarTreeWrapperProps {
  sidebarRef: React.Ref<SidebarClientHandle>
  showPlaceholder: boolean
  onNavigate: () => void
  internalScroll?: boolean
  scrollClass?: string
  hideActions?: boolean
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
        className="mb-3 text-[0.625rem] opacity-75"
      />

      <div className="space-y-6 pr-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="size-1 bg-tech-main/45" />
            <SegmentedBar opacity="high" className="h-4 w-4/5" />
          </div>

          <div className="nested-list">
            <div className="flex items-center gap-2">
              <span className="h-px w-2 bg-tech-main/40" />
              <SegmentedBar opacity="medium" className="h-3.5 w-3/4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="h-px w-2 bg-tech-main/40" />
              <SegmentedBar opacity="medium" className="h-3.5 w-2/3" />
            </div>

            <div className="ml-2 nested-list">
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

          <div className="nested-list">
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

        <div className="nested-list">
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

function SidebarTreeWrapper({
  sidebarRef,
  showPlaceholder,
  onNavigate,
  internalScroll = false,
  scrollClass = "",
  hideActions = false,
}: SidebarTreeWrapperProps) {
  return (
    <div
      className={`
         w-full pb-4 font-mono text-[0.9375rem] wrap-break-word
         [&_li]:mt-1.5
         [&_ul]:list-none
         [&_ul_ul]:mt-1.5 [&_ul_ul]:mb-3 [&_ul_ul]:border-l [&_ul_ul]:guide-line
         [&_ul_ul]:pl-3
         [&>ul]:pl-0
         ${showPlaceholder ? "h-full min-h-full pb-0" : ""}
       `}
      aria-busy={showPlaceholder}>
      {showPlaceholder ? (
        <div className="h-full min-h-full pr-4">
          <TreeLoadingPlaceholder />
        </div>
      ) : (
        <SidebarClient
          tree={[]}
          onNavigate={onNavigate}
          ref={sidebarRef}
          internalScroll={internalScroll}
          scrollClass={scrollClass}
          hideActions={hideActions}
        />
      )}
    </div>
  )
}

export function ArticlesLayoutClient({ children, tree }: ArticlesLayoutProps) {
  const SIDEBAR_HIDDEN_KEY = "gtmc_sidebar_hidden"
  const [isOpen, setIsOpen] = useState(false)
  const [isStuck, setIsStuck] = useState(false)
  const [showFullText, setShowFullText] = useState(true)
  const [treeData, setTreeData] = useState<TreeNode[]>(tree)
  const [isTreeLoading, setIsTreeLoading] = useState(tree.length === 0)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const pathname = usePathname()
  const desktopSidebarRef = useRef<SidebarClientHandle>(null)
  const floatingCardSidebarRef = useRef<SidebarClientHandle>(null)
  const t = useTranslations("Sidebar")

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "true") {
        setSidebarHidden(true)
      }
    } catch { }
  }, [])

  const toggleSidebarHidden = () => {
    setSidebarHidden((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_HIDDEN_KEY, String(next))
      } catch { }
      return next
    })
  }

  useEffect(() => {
    if (pathname) {
      setIsOpen(false)
    }
  }, [pathname])

  useEffect(() => {
    const timer = setTimeout(
      () => {
        setShowFullText(!isStuck)
      },
      isStuck ? 0 : 250
    )
    return () => clearTimeout(timer)
  }, [isStuck])

  useEffect(() => {
    const NAVBAR_HEIGHT = 64

    const handleScroll = () => {
      const currentlyStuck = window.scrollY > NAVBAR_HEIGHT
      setIsStuck((prev) => {
        if (currentlyStuck && !prev) {
          setIsOpen(false)
        }
        return currentlyStuck
      })
    }

    // Sync immediately on mount in case page is already scrolled
    handleScroll()

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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

  const onNavigate = () => setIsOpen(false)

  const fixedTreeContent = (
    <SidebarTreeWrapper
      sidebarRef={desktopSidebarRef}
      showPlaceholder={showTreePlaceholder}
      onNavigate={onNavigate}
      internalScroll
      scrollClass="pr-4"
    />
  )

  const floatingTreeContent = (
    <SidebarTreeWrapper
      sidebarRef={floatingCardSidebarRef}
      showPlaceholder={showTreePlaceholder}
      onNavigate={onNavigate}
      internalScroll
    />
  )

  return (
    <SidebarProvider tree={treeData}>
      <div
        className="
          relative isolate mx-auto flex min-h-[calc(100vh-8rem)] flex-col
          md:flex-row md:justify-center md:gap-8
        ">
        <div
          className="
            sticky top-16 z-30
            md:hidden
          ">
          <div
            className="relative transition-all duration-500 ease-out"
            style={
              {
                padding: isStuck ? "1rem 1rem 0 1rem" : "0",
                justifyContent: isStuck ? "flex-end" : "stretch",
              } as React.CSSProperties
            }>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen(!isOpen)
              }}
              className="
                cursor-pointer overflow-hidden border border-tech-main/40
                bg-white/70 font-mono text-xs font-bold tracking-[0.15em]
                text-tech-main backdrop-blur-sm transition-all duration-400
                ease-out
                hover:bg-tech-main/5
              "
              style={
                {
                  width: isStuck ? "5rem" : "100%",
                  minHeight: isStuck ? "2rem" : "3rem",
                  padding: isStuck ? "0.25rem 1rem" : "1rem",
                  borderBottom: isStuck ? undefined : "1px solid",
                  boxShadow: isStuck
                    ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                    : "none",
                } as React.CSSProperties
              }
              aria-label="Toggle article tree"
              aria-expanded={isOpen}
              data-testid="mobile-tree-toggle">
              <div className="relative flex w-full items-center justify-between">
                <span
                  className="transition-opacity duration-150"
                  style={{ opacity: showFullText ? 1 : 0 }}>
                  {t("title")}
                </span>
                <span
                  className="
                    absolute left-1/2 line-clamp-none w-full
                    -translate-x-1/2 transition-opacity
                  "
                  style={{ opacity: showFullText ? 0 : 1 }}>
                  {t("titleShort")}
                </span>
                <span
                  className="text-sm font-bold transition-opacity duration-200"
                  style={{ opacity: showFullText ? 1 : 0 }}>
                  {isOpen ? "▼" : "▶"}
                </span>
              </div>
            </button>
          </div>

          <div
            className={`
              grid transition-all duration-300 ease-out
              ${isOpen && !isStuck
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
              }
            `}>
            <div className="overflow-hidden">
              <div
                className="
                  max-h-[calc(100vh-12rem)] overflow-y-auto overscroll-contain
                  border-t guide-line bg-white/95 px-4 pt-3 pb-4
                ">
                {fixedTreeContent}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile floating tree card */}
        <MobileTreeCard
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          isFloating={isStuck}>
          {floatingTreeContent}
        </MobileTreeCard>

        {/* Desktop sidebar */}
        <div
          className="
            relative hidden shrink-0 self-stretch
            md:block
          "
          data-sidebar-wrapper
          data-sidebar-hidden={sidebarHidden ? "" : undefined}>
          <div className="flex h-full">
            <aside
              className="
                h-full w-64 overflow-clip border-r guide-line
                transition-[width,opacity,border-color] duration-300
                ease-[cubic-bezier(0.16,1,0.3,1)]
                lg:w-80
              "
              style={{
                width: sidebarHidden ? 0 : undefined,
                opacity: sidebarHidden ? 0 : 1,
                borderRightWidth: sidebarHidden ? 0 : undefined,
              }}>
              <div
                className="
                  sticky top-20 flex w-64 flex-col justify-center
                  hover:z-20
                  sm:top-26 sm:h-[calc(100vh-128px)]
                  lg:top-28 lg:h-[calc(100vh-144px)] lg:w-80
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
                            mr-2 inline-block size-1.5 animate-pulse
                            bg-tech-main/60
                          "
                        />
                        SYS.DIR_TREE
                      </div>
                    </div>
                  </div>

                  {showTreePlaceholder ? (
                    <div
                      className="
                        custom-left-scrollbar h-full min-h-0 flex-1
                        overflow-y-auto
                      ">
                      <TreeLoadingPlaceholder />
                    </div>
                  ) : (
                    <SidebarClient
                      ref={desktopSidebarRef}
                      tree={treeData}
                      internalScroll
                      scrollClass="pr-4"
                    />
                  )}
                </div>
              </div>
            </aside>

            <div className="relative h-full w-0">
              <div className="sticky top-[50vh] -translate-y-1/2 justify-center overflow-visible">
                <button
                  type="button"
                  onClick={toggleSidebarHidden}
                  aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
                  aria-expanded={!sidebarHidden}
                  data-sidebar-toggle=""
                  className="
                      absolute top-0 -left-3 z-40 flex size-6
                      -translate-y-1/2 cursor-pointer items-center justify-center
                      border guide-line bg-tech-bg text-tech-main/40
                      transition-[opacity,color,background-color] duration-300
                      ease-[cubic-bezier(0.16,1,0.3,1)]
                      hover:bg-tech-main/5 hover:text-tech-main
                    ">
                  <span
                    className="
                      text-[0.5rem] leading-none font-bold select-none
                    ">
                    {sidebarHidden ? "▶" : "◀"}
                  </span>
                </button>
                <span className="absolute top-4 -right-3 inline-block text-right font-mono text-[0.625rem] font-bold text-tech-main/60">
                  {" "}
                  {sidebarHidden ? "expand sidebar" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        <main
          className={`
            relative my-6 w-full flex-1 transition-all duration-300
            ease-[cubic-bezier(0.16,1,0.3,1)]
            ${sidebarHidden
              ? `
                  md:max-w-3xl
                  xl:max-w-3xl
                  [1920px]:max-w-4xl
                `
              : `
                  md:max-w-2xl
                  xl:max-w-3xl
                  [1920px]:max-w-4xl
                `
            }
          `}>
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
