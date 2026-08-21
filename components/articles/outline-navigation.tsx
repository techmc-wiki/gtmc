"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useReaderNavigation } from "@/app/[locale]/(public)/articles/reader-navigation/context"
import { useFooterOverlap } from "@/hooks/use-footer-overlap"
import { useScrollProgress } from "@/hooks/use-scroll-progress"
import { ReaderDock } from "@/components/articles/reader-dock"
import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/shadcn/sheet"
import styles from "./outline-rail.module.css"

const railDepthClasses = {
  1: "text-[0.8125rem]/snug",
  2: "pl-2 text-xs/snug",
  3: "pl-4 text-[0.6875rem]/snug",
} satisfies Record<1 | 2 | 3, string>

const stationDepthClasses = {
  1: "scale-x-[0.72]",
  2: "scale-x-[0.46]",
  3: "scale-x-[0.24]",
} satisfies Record<1 | 2 | 3, string>

const inactiveDepthClasses = {
  1: "text-tech-main/65",
  2: "text-tech-main/50",
  3: "text-tech-main/40",
} satisfies Record<1 | 2 | 3, string>

const mobileDepthClasses = {
  1: "pl-4 text-sm/snug",
  2: "pl-7 text-[0.8125rem]/snug",
  3: "pl-10 text-xs/snug",
} satisfies Record<1 | 2 | 3, string>

type ProgressStyle = React.CSSProperties & {
  "--outline-progress": number
  "--outline-progress-position": string
}

function formatOrdinal(value: number): string {
  return String(value).padStart(2, "0")
}

function PlotterAxis() {
  const t = useTranslations("Outline")
  const { progress } = useScrollProgress()
  const percentage = Math.round(progress * 100)
  const progressStyle = React.useMemo<ProgressStyle>(
    () => ({
      "--outline-progress": progress,
      "--outline-progress-position": `${progress * 100}%`,
    }),
    [progress]
  )

  return (
    <div
      className="pointer-events-none absolute inset-y-0 left-14 w-px"
      style={progressStyle}>
      <progress
        className="sr-only"
        aria-label={t("progressLabel")}
        max={100}
        value={percentage}>
        {percentage}%
      </progress>
      <span className="bg-tech-main/15 absolute inset-y-0 left-0 w-px" />
      <span
        className={`${styles.trace} bg-tech-signal/70 absolute inset-y-0 left-0 w-px`}
      />

      <span className="border-tech-main/30 bg-tech-bg absolute top-0 left-0 size-2 -translate-x-1/2 -translate-y-1/2 border" />
      <span className="border-tech-main/30 bg-tech-bg absolute bottom-0 left-0 size-2 -translate-x-1/2 translate-y-1/2 border" />

      <span className={`${styles.plotterHead} absolute left-0`} aria-hidden="true">
        <span className="bg-tech-signal absolute top-0 left-0 size-2 -translate-x-1/2 -translate-y-1/2" />
        <span className="bg-tech-signal/75 absolute top-0 right-2 h-px w-2" />
        <span className="text-tech-signal absolute top-0 right-4 -translate-y-1/2 font-mono text-[0.5rem] tracking-[0.08em] whitespace-nowrap uppercase tabular-nums">
          ΔY {String(percentage).padStart(3, "0")}%
        </span>
      </span>
    </div>
  )
}

/** Desktop "On This Page" rail with a scroll-progress plotter axis. */
export function OutlineRail() {
  const t = useTranslations("Outline")
  const { outline, activeHeadingId } = useReaderNavigation()
  const outlineListRef = React.useRef<HTMLUListElement | null>(null)
  const activeItemRef = React.useRef<HTMLLIElement | null>(null)
  const effectiveActiveHeadingId = activeHeadingId ?? outline[0]?.id ?? null

  const activeIndex = React.useMemo(() => {
    const index = outline.findIndex(
      (item) => item.id === effectiveActiveHeadingId
    )
    return index >= 0 ? index : 0
  }, [effectiveActiveHeadingId, outline])

  React.useEffect(() => {
    const list = outlineListRef.current
    const activeItem = activeItemRef.current
    if (!list || !activeItem) return

    const targetTop = Math.max(
      0,
      activeItem.offsetTop - list.clientHeight * 0.3
    )
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    list.scrollTo({
      top: targetTop,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    })
  }, [effectiveActiveHeadingId])

  if (outline.length === 0) {
    return (
      <div className="hidden h-full w-full min-w-0 shrink-0 xl:block" aria-hidden="true" />
    )
  }

  return (
    <div className="hidden h-full w-full min-w-0 shrink-0 xl:block">
      <div className="sticky top-28 z-20 h-[calc(100dvh-9rem)] min-h-0">
        <nav
          aria-label={t("railLabel")}
          className="relative flex h-full min-h-0 w-full overflow-visible pr-2">
          <PlotterAxis />

          <div className="flex min-h-0 w-full flex-col pl-16">
            <header className="guide-line flex shrink-0 items-baseline justify-between gap-2 border-b pt-1 pb-3">
              <span className="font-mono text-[0.625rem] font-bold tracking-[0.18em] text-tech-main/60 uppercase">
                {t("title")}
              </span>
              <span className="font-mono text-[0.5625rem] tracking-[0.12em] text-tech-main/45 tabular-nums">
                {formatOrdinal(activeIndex + 1)} / {formatOrdinal(outline.length)}
              </span>
            </header>

            <ul
              ref={outlineListRef}
              className="custom-vertical-scrollbar -ml-2 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto py-4 pr-2 pl-2 overscroll-contain">
              {outline.map((item) => {
                const isActive = item.id === effectiveActiveHeadingId

                return (
                  <li
                    key={item.id}
                    ref={isActive ? activeItemRef : undefined}
                    className="group/station relative">
                    <span
                      aria-hidden="true"
                      className={`absolute top-1/2 -left-2 h-px w-2 origin-right -translate-y-1/2 transition-[scale,background-color,opacity] duration-200 motion-reduce:transition-none group-hover/station:scale-x-100 group-focus-within/station:scale-x-100 ${
                        isActive
                          ? "scale-x-100 bg-tech-signal"
                          : `bg-tech-main/25 ${stationDepthClasses[item.depth]}`
                      }`}
                    />
                    <Link
                      href={`#${item.id}`}
                      aria-current={isActive ? "location" : undefined}
                      className={`relative block py-1.5 pr-1 wrap-break-word transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-tech-main motion-reduce:transition-none ${railDepthClasses[item.depth]} ${
                        isActive
                          ? "font-semibold text-tech-main-dark"
                          : `${inactiveDepthClasses[item.depth]} hover:text-tech-main-dark`
                      }`}>
                      {item.text}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  )
}

const emptySubscribe = () => () => {}

/** Mobile outline: floating progress pill + bottom sheet with the same links. */
export function MobileOutlineBar() {
  const t = useTranslations("Outline")
  const { outline, activeHeadingId } = useReaderNavigation()
  const { hasScrolledPastNavbar, progress } = useScrollProgress({
    navbarThreshold: 64,
  })
  const isOverlappingFooter = useFooterOverlap()
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const closeSheet = React.useCallback(() => setIsSheetOpen(false), [])
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  const pct = Math.round(progress * 100)
  const progressWidthStyle = React.useMemo(
    (): React.CSSProperties => ({ width: `${pct}%` }),
    [pct]
  )

  if (!mounted || outline.length === 0) return null

  const effectiveActiveHeadingId = activeHeadingId ?? outline[0]?.id ?? null
  const activeItem = outline.find(
    (item) => item.id === effectiveActiveHeadingId
  )
  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <ReaderDock
        pct={pct}
        visible={hasScrolledPastNavbar && !isOverlappingFooter}
        sectionLabel={activeItem?.text ?? null}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="text-tech-main-dark hover:bg-tech-main/5 flex h-full min-w-0 cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors"
            aria-label={t("openSheet")}>
            <span className="max-w-[38vw] truncate font-mono text-xs font-bold">
              {activeItem?.text}
            </span>
            <span
              aria-hidden="true"
              className="text-tech-main/50 font-mono text-[0.625rem]">
              ▸
            </span>
          </button>
        </SheetTrigger>
      </ReaderDock>
      {/* Bottom Sheet */}
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-label={t("sheetLabel")}
        className="border-t border-tech-main/30 bg-surface-overlay/95 max-h-[70dvh] p-0 backdrop-blur-md">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b guide-line px-4 py-3">
          <div className="flex items-center gap-3">
            <SheetTitle className="font-mono text-xs font-bold tracking-[0.12em] text-tech-main/60 uppercase">
              {t("title")}
            </SheetTitle>
            <span className="font-mono text-[0.625rem] tracking-[0.08em] text-tech-signal uppercase tabular-nums">
              ΔY {String(pct).padStart(3, "0")}%
            </span>
          </div>

          <div className="mx-4 h-0.5 flex-1 bg-tech-main/15">
            <div
              className="h-full bg-tech-signal transition-[width] duration-150"
              style={progressWidthStyle}
            />
          </div>

          <SheetClose asChild>
            <button
              type="button"
              className="cursor-pointer px-3 py-2 font-mono text-xs font-bold tracking-[0.15em] text-tech-main uppercase transition-colors hover:bg-tech-main/10"
              aria-label={t("closeSheet")}>
              {t("close")}
            </button>
          </SheetClose>
        </div>

        {/* Outline list */}
        <ul className="flex-1 overflow-y-auto px-4 py-3">
          {outline.map((item) => {
            const isActive = item.id === effectiveActiveHeadingId
            return (
              <li key={item.id}>
                <Link
                  href={`#${item.id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={closeSheet}
                  className={`block border-l-[3px] py-2.5 pr-2 transition-all duration-200 ${mobileDepthClasses[item.depth]} ${
                    isActive
                      ? "border-tech-signal text-tech-main-dark font-semibold"
                      : "text-tech-main/60 hover:border-tech-main/30 hover:text-tech-main border-transparent"
                  }`}>
                  {item.text}
                </Link>
              </li>
            )
          })}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
