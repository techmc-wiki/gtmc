"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useReaderNavigation } from "@/app/[locale]/(public)/articles/reader-navigation/context"
import { useFooterOverlap } from "@/hooks/use-footer-overlap"
import { useModalEffects } from "@/hooks/use-modal-effects"
import { useScrollProgress } from "@/hooks/use-scroll-progress"
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

/** Mobile outline: progress strip under the navbar + bottom sheet with the same links. */
export function MobileOutlineBar() {
  const t = useTranslations("Outline")
  const { outline, activeHeadingId } = useReaderNavigation()
  const { hasScrolledPastNavbar, progress } = useScrollProgress({
    navbarThreshold: 64,
  })
  const isOverlappingFooter = useFooterOverlap()
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const sheetRef = React.useRef<HTMLDialogElement | null>(null)
  const shouldRestoreFocusRef = React.useRef(false)
  const closeSheet = React.useCallback(() => setIsSheetOpen(false), [])
  const openSheet = React.useCallback(() => setIsSheetOpen(true), [])
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  useModalEffects({ isOpen: isSheetOpen, onClose: closeSheet })

  React.useEffect(() => {
    if (isSheetOpen) {
      shouldRestoreFocusRef.current = true
      const animationFrame = window.requestAnimationFrame(() => {
        closeButtonRef.current?.focus()
      })
      return () => window.cancelAnimationFrame(animationFrame)
    }

    if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false
      triggerRef.current?.focus()
    }
  }, [isSheetOpen])

  const handleSheetKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDialogElement>) => {
      if (event.key !== "Tab") return

      const focusableElements = sheetRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    },
    []
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
    <>
      {/* Progress strip — fixed just below sticky navbar */}
      <div
        className={`pointer-events-none fixed inset-x-0 top-16 z-20 h-20 transition-opacity duration-500 md:top-20 xl:hidden ${hasScrolledPastNavbar && !isOverlappingFooter ? "opacity-100" : "opacity-0"}`}>
        {/* Section label — fixed right-aligned in navbar row */}
        {activeItem && (
          <button
            ref={triggerRef}
            type="button"
            className="pointer-events-auto flex h-fit w-full items-center px-4 py-2 pr-4 backdrop-blur-xs xl:hidden"
            aria-label={t("openSheet")}
            aria-expanded={isSheetOpen}
            aria-controls="article-outline-sheet"
            onClick={openSheet}>
            <div className="max-w-[40vw] truncate font-mono text-xs font-bold text-tech-main transition-colors duration-150 hover:text-tech-main">
              {activeItem.text}
            </div>
          </button>
        )}
        <div
          className="pr-28">
          <progress
            className="sr-only"
            aria-label={t("progressLabel")}
            max={100}
            value={pct}>
            {pct}%
          </progress>
          <div
            className="bg-tech-signal h-0.5 transition-[width] duration-150"
            style={progressWidthStyle}
          />
        </div>
      </div>

      {/* Bottom Sheet overlay */}
      <div
        className={`fixed inset-0 z-60 xl:hidden ${isSheetOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!isSheetOpen}>
        {/* Backdrop */}
        <button
          type="button"
          aria-label={t("closeSheet")}
          className={`absolute inset-0 w-full bg-black/20 backdrop-blur-xs transition-opacity duration-300 ${isSheetOpen ? "opacity-100" : "opacity-0"}`}
          onClick={closeSheet}
        />

        {/* Sheet panel */}
        <dialog
          open
          ref={sheetRef}
          id="article-outline-sheet"
          className={`absolute inset-x-0 bottom-0 m-0 flex w-full max-w-none max-h-[70dvh] flex-col border-t border-tech-main/30 bg-surface-overlay/95 p-0 text-inherit backdrop-blur-md transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSheetOpen ? "translate-y-0" : "translate-y-full"}`}
          aria-modal={isSheetOpen ? "true" : undefined}
          aria-label={t("sheetLabel")}
          onKeyDown={handleSheetKeyDown}>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b guide-line px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold tracking-[0.12em] text-tech-main/60 uppercase">
                {t("title")}
              </span>
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

            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeSheet}
              className="cursor-pointer px-3 py-2 font-mono text-xs font-bold tracking-[0.15em] text-tech-main uppercase transition-colors hover:bg-tech-main/10"
              aria-label={t("closeSheet")}>
              {t("close")}
            </button>
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
        </dialog>
      </div>
    </>
  )
}
