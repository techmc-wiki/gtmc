"use client"

import * as React from "react"
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react"
import { ChapterNavPanel } from "./chapter-nav-panel"
import { ReaderNavigationProvider } from "./reader-navigation/context"
import {
  SectionRail,
  SegmentedBar,
} from "@/components/ui/loading-shell-primitives"
import { TriangleIcon } from "@/components/ui/icons"
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types"
import { useLocale, useTranslations } from "next-intl"
import {
  OutlineRail,
  MobileOutlineBar,
} from "@/components/articles/outline-navigation"
import { useFooterOverlap } from "@/hooks/use-footer-overlap"

const treeDropInStyle: React.CSSProperties = {
  animation: "tree-drop-in 1.05s cubic-bezier(0.16, 1, 0.3, 1) both",
}

interface ArticlesLayoutProps {
  children: React.ReactNode
  tree: ChapterNavNode[]
}

interface ChapterNavContentProps {
  showPlaceholder: boolean
  onNavigate: () => void
  scrollClassName?: string
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
      <SectionRail
        label="Loading"
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

function ChapterNavContent({
  showPlaceholder,
  onNavigate,
  scrollClassName,
}: ChapterNavContentProps) {
  return (
    <div
      className={`flex min-h-0 w-full flex-1 flex-col ${showPlaceholder ? "h-full" : ""}`}
      aria-busy={showPlaceholder}>
      {showPlaceholder ? (
        <div className="h-full min-h-full pr-4">
          <TreeLoadingPlaceholder />
        </div>
      ) : (
        <ChapterNavPanel
          onNavigate={onNavigate}
          scrollClassName={scrollClassName}
        />
      )}
    </div>
  )
}

export function ArticlesLayoutClient({ children, tree }: ArticlesLayoutProps) {
  const CHAPTER_NAV_HIDDEN_KEY = "gtmc_chapter_nav_hidden"
  const [fetchedTreeData, setFetchedTreeData] = useState<ChapterNavNode[]>([])
  const [hasTreeFetchSettled, setHasTreeFetchSettled] = useState(
    () => tree.length > 0
  )
  const [chapterNavHidden, setChapterNavHidden] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)
  const [isChapterNavOpen, setIsChapterNavOpen] = useState(false)
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

  const chapterNavAsideStyle = useMemo(
    (): React.CSSProperties => ({
      width: chapterNavHidden ? 0 : undefined,
      opacity: chapterNavHidden ? 0 : 1,
      borderRightWidth: chapterNavHidden ? 0 : undefined,
    }),
    [chapterNavHidden]
  )

  const onNavigate = useCallback(() => {
    setIsChapterNavOpen(false)
  }, [])

  const handleMobileToggle = useCallback(() => {
    setIsChapterNavOpen((open) => !open)
  }, [])

  // Sentinel + IntersectionObserver: the only JS involved in the
  // sticky-to-stuck transition (visual state only — CSS does the sticking).
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const chapterNavContent = (
              <ChapterNavPanel onNavigate={onNavigate} />
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
          {/* Mobile chapter nav: CSS sticky bar; JS only toggles stuck visuals */}
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
          <div
            className={`
              sticky top-16 z-30 border-y transition-[background-color,box-shadow,border-color]
              duration-200 md:hidden
              ${
                isStuck
                  ? "border-tech-main/40 bg-surface-overlay/95 shadow-sm backdrop-blur-sm"
                  : "border-transparent bg-transparent"
              }
              ${isOverlappingFooter && !isChapterNavOpen ? "pointer-events-none opacity-0" : "opacity-100"}
            `}>
            <button
              type="button"
              onClick={handleMobileToggle}
              aria-expanded={isChapterNavOpen}
              aria-label={tA11y("toggleArticleTree")}
              data-testid="mobile-tree-toggle"
              className="flex h-12 w-full cursor-pointer items-center justify-between px-4 font-mono text-xs font-bold tracking-[0.15em] text-tech-main uppercase transition-colors hover:bg-tech-main/5">
              <span>{t("title")}</span>
              <TriangleIcon
                direction={isChapterNavOpen ? "down" : "right"}
                className="size-3"
              />
            </button>
            <div
              className={`
                grid transition-all duration-300 ease-out
                ${isChapterNavOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
              `}>
              <div className="overflow-hidden">
                <div className="border-t border-tech-main/30 bg-surface-overlay/95 max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain px-4 pt-3 pb-4">
                  {chapterNavContent}
                </div>
              </div>
            </div>
          </div>


        {/* Desktop chapter navigation */}
        <div
          className={`
            relative hidden shrink-0 self-stretch
            md:col-start-1 md:justify-self-end md:block
            ${chapterNavHidden ? "md:col-span-1" : "md:col-span-3"}
          `}
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
                    flex max-h-4/5 min-h-0 flex-1 flex-col overflow-visible
                    border-b guide-line text-tech-main
                    md:px-4 md:py-2
                  ">
                  <div className="flex shrink-0 items-center gap-2 border-b pb-2 guide-line">
                    <span className="size-1.5 shrink-0 bg-tech-signal" />
                    <h2 className="display-title text-sm text-tech-main-dark/70">
                      {t("title")}
                    </h2>
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
                    <ChapterNavPanel scrollClassName="pr-4" />
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
          className={`
            relative my-6 min-w-0
            md:w-full
            md:mx-auto
            md:max-w-4xl
            ${chapterNavHidden ? "md:col-start-3 md:col-span-10 xl:col-span-9" : "md:col-start-4 md:col-span-9 xl:col-span-7"}
          `}>
          {children}
        </main>

        <div className="hidden xl:col-start-11 xl:col-span-2 xl:block xl:justify-self-stretch xl:self-stretch">
          <OutlineRail />
        </div>
      </div>
    </ReaderNavigationProvider>
  )
}
