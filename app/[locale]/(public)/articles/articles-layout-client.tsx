"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  ChapterNavPanel,
  type ChapterNavPanelHandle,
} from "./chapter-nav-panel"
import { ReaderNavigationProvider } from "./reader-navigation/context"
import { MobileChapterNavCard } from "./mobile-chapter-nav-card"
import { useMobileChapterNavMachine } from "@/app/[locale]/(public)/articles/mobile-chapter-nav/use-mobile-chapter-nav-machine"
import { LABEL_MORPH_DELAY_MS } from "@/app/[locale]/(public)/articles/mobile-chapter-nav/config"
import {
  ScanConfirmOverlay,
  SectionRail,
  SegmentedBar,
} from "@/components/ui/loading-shell-primitives"
import { TriangleIcon } from "@/components/ui/triangle-icon"
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"
import { useLocale, useTranslations } from "next-intl"
import { OutlineRail } from "@/components/articles/outline-rail"
import { MobileOutlineBar } from "@/components/articles/mobile-outline-bar"
import { useFooterOverlap } from "@/hooks/use-footer-overlap"

const treeDropInStyle: React.CSSProperties = {
  animation: "tree-drop-in 1.05s cubic-bezier(0.16, 1, 0.3, 1) both",
}

const EMPTY_TREE: ChapterNavNode[] = []

interface ArticlesLayoutProps {
  children: React.ReactNode
  tree: ChapterNavNode[]
}

interface ChapterNavWrapperProps {
  chapterNavRef: React.Ref<ChapterNavPanelHandle>
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
        bg-surface-overlay/80 px-3 py-4
        motion-reduce:animate-none
        md:min-h-160 md:px-4 md:py-5
      "
      style={treeDropInStyle}
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

function ChapterNavWrapper({
  chapterNavRef,
  showPlaceholder,
  onNavigate,
  internalScroll = false,
  scrollClass = "",
  hideActions = false,
}: ChapterNavWrapperProps) {
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
        <ChapterNavPanel
          tree={EMPTY_TREE}
          onNavigate={onNavigate}
          ref={chapterNavRef}
          internalScroll={internalScroll}
          scrollClass={scrollClass}
          hideActions={hideActions}
        />
      )}
    </div>
  )
}

export function ArticlesLayoutClient({ children, tree }: ArticlesLayoutProps) {
  const CHAPTER_NAV_HIDDEN_KEY = "gtmc_chapter_nav_hidden"
  const [showFullText, setShowFullText] = useState(true)
  const [fetchedTreeData, setFetchedTreeData] = useState<ChapterNavNode[]>([])
  const [hasTreeFetchSettled, setHasTreeFetchSettled] = useState(
    () => tree.length > 0
  )
  const [chapterNavHidden, setChapterNavHidden] = useState(false)
  const desktopChapterNavRef = useRef<ChapterNavPanelHandle>(null)
  const floatingCardChapterNavRef = useRef<ChapterNavPanelHandle>(null)
  const machine = useMobileChapterNavMachine()
  const {
    state,
    dispatch,
    isOpen: isChapterNavOpen,
    isFloating,
    isStuck,
  } = machine
  void state
  const locale = useLocale()
  const t = useTranslations("ChapterNav")
  const tA11y = useTranslations("CommonA11y")
  const treeData = tree.length > 0 ? tree : fetchedTreeData
  const isOverlappingFooter = useFooterOverlap()

  useEffect(() => {
    try {
      setChapterNavHidden(
        localStorage.getItem(CHAPTER_NAV_HIDDEN_KEY) === "true"
      )
    } catch {}
  }, [])

  const toggleChapterNavHidden = useCallback(() => {
    setChapterNavHidden((prev) => {
      const next = !prev
      try {
        localStorage.setItem(CHAPTER_NAV_HIDDEN_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(
      () => {
        setShowFullText(!isStuck)
      },
      isStuck ? 0 : LABEL_MORPH_DELAY_MS
    )
    return () => clearTimeout(timer)
  }, [isStuck])

  useEffect(() => {
    if (tree.length > 0) {
      return
    }

    const controller = new AbortController()
    let active = true

    const loadTree = async () => {
      try {
        const response = await fetch(`/api/articles/tree?locale=${locale}`, {
          method: "GET",
          signal: controller.signal,
        })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as ChapterNavNode[]
        if (active && Array.isArray(payload)) {
          setFetchedTreeData(payload)
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }
      } finally {
        if (active) {
          setHasTreeFetchSettled(true)
        }
      }
    }

    void loadTree()

    return () => {
      active = false
      controller.abort()
    }
  }, [locale, tree, tree.length])

  const isChapterNavLoading = tree.length === 0 && !hasTreeFetchSettled
  const showChapterNavPlaceholder = isChapterNavLoading && treeData.length === 0

  const onNavigate = useCallback(
    () => dispatch({ type: "NAVIGATE" }),
    [dispatch]
  )

  const mobileContainerStyle = useMemo(
    (): React.CSSProperties => ({
      padding: isStuck ? "1rem 1rem 0 1rem" : "0",
      justifyContent: isStuck ? "flex-end" : "stretch",
    }),
    [isStuck]
  )

  const mobileButtonStyle = useMemo(
    (): React.CSSProperties => ({
      width: isStuck ? "5rem" : "100%",
      minHeight: isStuck ? "" : "3rem",
      padding: isStuck ? "0.125rem 0.5rem" : "1rem",
      borderBottom: isStuck ? undefined : "1px solid",
      boxShadow: isStuck ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
      right: isStuck ? undefined : 0,
    }),
    [isStuck]
  )

  const visibleOpacityStyle = useMemo(
    (): React.CSSProperties => ({ opacity: showFullText ? 1 : 0 }),
    [showFullText]
  )

  const hiddenOpacityStyle = useMemo(
    (): React.CSSProperties => ({ opacity: showFullText ? 0 : 1 }),
    [showFullText]
  )

  const chapterNavAsideStyle = useMemo(
    (): React.CSSProperties => ({
      width: chapterNavHidden ? 0 : undefined,
      opacity: chapterNavHidden ? 0 : 1,
      borderRightWidth: chapterNavHidden ? 0 : undefined,
    }),
    [chapterNavHidden]
  )

  const handleMobileToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dispatch({ type: "TOGGLE" })
    },
    [dispatch]
  )

  const handleMobileClose = useCallback(
    () => dispatch({ type: "CLOSE" }),
    [dispatch]
  )

  const fixedChapterNavContent = (
    <ChapterNavWrapper
      chapterNavRef={desktopChapterNavRef}
      showPlaceholder={showChapterNavPlaceholder}
      onNavigate={onNavigate}
      internalScroll
      scrollClass="pr-4"
    />
  )

  const floatingChapterNavContent = (
    <ChapterNavWrapper
      chapterNavRef={floatingCardChapterNavRef}
      showPlaceholder={showChapterNavPlaceholder}
      onNavigate={onNavigate}
      internalScroll
    />
  )

  return (
    <ReaderNavigationProvider tree={treeData}>
      <MobileOutlineBar />
      <div
        className={`
          relative isolate flex min-h-[calc(100dvh-8rem)] min-w-0
          flex-col overflow-x-clip
          md:grid md:grid-cols-12
          md:gap-6
          md:max-w-360 md:mx-auto
        `}>
        <div
          className={`
            relative z-30 md:hidden
          `}>
          <div className="relative" style={mobileContainerStyle}>
            <button
              type="button"
              onClick={handleMobileToggle}
              className={`
                cursor-pointer overflow-hidden
                border border-tech-main/40 bg-surface-overlay/70 font-mono text-xs
                font-bold tracking-[0.15em] text-tech-main
                transition-[background-color,color,opacity] duration-150 ease-out
                hover:bg-tech-main/5
                ${isStuck ? "fixed top-28 right-4 z-50" : "absolute"}
                ${isStuck && isOverlappingFooter ? "pointer-events-none opacity-0" : "opacity-100"}
              `}
              style={mobileButtonStyle}
              aria-label={tA11y("toggleArticleTree")}
              aria-expanded={isChapterNavOpen}
              data-testid="mobile-tree-toggle">
              <div className="relative flex w-full items-center justify-between">
                <span
                  className="transition-opacity duration-150"
                  style={visibleOpacityStyle}>
                  {t("title")}
                </span>
                <span
                  className="
                    absolute left-1/2 line-clamp-none w-full
                    -translate-x-1/2 transition-opacity
                  "
                  style={hiddenOpacityStyle}>
                  {t("titleShort")}
                </span>
                <span
                  className="
                    flex size-4 items-center justify-center
                    transition-opacity duration-200
                  "
                  style={visibleOpacityStyle}>
                  <TriangleIcon
                    direction={isChapterNavOpen ? "down" : "right"}
                    className="size-3"
                  />
                </span>
              </div>
            </button>
            <div className="h-12" />
          </div>

          <div
            className={`
              grid transition-all duration-300 ease-out
              ${
                isChapterNavOpen && !isFloating
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }
            `}>
            <div className="overflow-hidden">
              <div
                className="
                  max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain
                  border-t guide-line bg-surface-overlay/95 px-4 pt-3 pb-4
                ">
                {fixedChapterNavContent}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile floating chapter navigation card */}
        <MobileChapterNavCard
          isOpen={isChapterNavOpen}
          onClose={handleMobileClose}
          isFloating={isFloating}>
          {floatingChapterNavContent}
        </MobileChapterNavCard>

        {/* Desktop chapter navigation */}
        <div
          className="
            relative hidden shrink-0 self-stretch
            md:col-start-1 md:col-span-3 md:justify-self-end
            md:block
          "
          data-chapter-nav-region
          data-chapter-nav-hidden={chapterNavHidden ? "" : undefined}>
          <div className="flex h-full">
            <aside
              className="
                h-full w-56 overflow-clip border-r guide-line
                transition-[width,opacity,border-color] duration-300
                ease-[cubic-bezier(0.16,1,0.3,1)]
              "
              style={chapterNavAsideStyle}>
              <div
                className="
                  sticky top-20 flex w-56 flex-col justify-center
                  hover:z-20
                  sm:top-26 sm:h-[calc(100dvh-128px)]
                  lg:top-28 lg:h-[calc(100dvh-144px)]
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
                        {t("title")}
                      </div>
                    </div>
                  </div>

                  {showChapterNavPlaceholder ? (
                    <div
                      className="
                        reader-rail-scrollbar h-full min-h-0 flex-1
                        overflow-y-auto
                      ">
                      <TreeLoadingPlaceholder />
                    </div>
                  ) : (
                    <ChapterNavPanel
                      ref={desktopChapterNavRef}
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
                  onClick={toggleChapterNavHidden}
                  aria-label={
                    chapterNavHidden
                      ? tA11y("showChapterNav")
                      : tA11y("hideChapterNav")
                  }
                  aria-expanded={!chapterNavHidden}
                  data-chapter-nav-toggle=""
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
                      flex size-3 items-center justify-center select-none
                    ">
                    <TriangleIcon
                      direction={chapterNavHidden ? "right" : "left"}
                      className="size-2.5"
                    />
                  </span>
                </button>
                <span className="absolute top-4 -right-3 inline-block text-right font-mono text-[0.625rem] font-bold text-tech-main/40">
                  {" "}
                  {chapterNavHidden ? "chapter navigation" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        <main
          className="
            relative my-6 min-w-0
            md:col-start-4
            md:col-span-7
            md:w-full
            md:mx-auto
            md:max-w-3xl
          ">
          {children}
        </main>

        <div className="md:col-start-11 md:col-span-2 md:justify-self-start md:self-stretch">
          <OutlineRail />
        </div>
      </div>
    </ReaderNavigationProvider>
  )
}
