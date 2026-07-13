"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useReaderNavigation } from "@/app/[locale]/(public)/articles/reader-navigation/context"
import { useFooterOverlap } from "@/hooks/use-footer-overlap"
import { useModalEffects } from "@/hooks/use-modal-effects"
import { useScrollProgress } from "@/hooks/use-scroll-progress"

const emptySubscribe = () => () => {}
const outlineDepthClasses = {
  1: "pl-4 text-sm/snug",
  2: "pl-7 text-[0.8125rem]/snug",
  3: "pl-10 text-xs/snug",
} satisfies Record<1 | 2 | 3, string>

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
                    className={`block border-l-[3px] py-2.5 pr-2 transition-all duration-200 ${outlineDepthClasses[item.depth]} ${
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
