"use client"

import * as React from "react"
import { Link } from "@/i18n/navigation"
import { useSidebarContext } from "@/app/[locale]/(articles)/articles/sidebar/sidebar-context"
import { useModalEffects } from "@/hooks/use-modal-effects"

const emptySubscribe = () => () => {}

function useScrollProgress() {
  const [progress, setProgress] = React.useState(0)
  const [hasScrolledPastNavbar, setHasScrolledPastNavbar] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.body.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0)
      setHasScrolledPastNavbar(scrollTop > 64)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return { hasScrolledPastNavbar, progress }
}

export function MobileTocBar() {
  const { toc, activeHeadingId } = useSidebarContext()
  const { hasScrolledPastNavbar, progress } = useScrollProgress()
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const closeSheet = React.useCallback(() => setIsSheetOpen(false), [])
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  useModalEffects({ isOpen: isSheetOpen, onClose: closeSheet })

  if (!mounted || toc.length === 0) return null

  const activeItem = toc.find((item) => item.id === activeHeadingId)
  const pct = Math.round(progress * 100)


  return (
    <>


      {/* Progress strip — fixed just below sticky navbar */}
      <div className={`pointer-events-none fixed inset-x-0 top-16 z-20 h-20 transition-opacity duration-500 sm:hidden ${hasScrolledPastNavbar ? "opacity-100" : "opacity-0"}`}>
        {/* Section label — fixed right-aligned in navbar row */}
        {activeItem && (
          <button type="button" className="pointer-events-auto flex h-fit w-full items-center px-4 py-2 pr-4 backdrop-blur-xs sm:hidden" aria-label="Open table of contents" onClick={() => setIsSheetOpen(true)}>
            <div
              className="max-w-[40vw] truncate font-mono text-xs font-bold text-tech-main transition-colors duration-150 hover:text-tech-main"
            >
              {activeItem.text}
            </div>
          </button>
        )}
        <div
          className="h-0.5 bg-tech-main transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>


      {/* Bottom Sheet overlay */}
      <div
        className={`fixed inset-0 z-60 sm:hidden ${isSheetOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!isSheetOpen}
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close table of contents"
          className={`absolute inset-0 w-full bg-black/20 backdrop-blur-xs transition-opacity duration-300 ${isSheetOpen ? "opacity-100" : "opacity-0"}`}
          onClick={closeSheet}
        />

        {/* Sheet panel */}
        <div
          className={`absolute inset-x-0 bottom-0 flex max-h-[70dvh] flex-col border-t border-tech-main/30 bg-white/95 backdrop-blur-md transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSheetOpen ? "translate-y-0" : "translate-y-full"}`}
          role={isSheetOpen ? "dialog" : undefined}
          aria-modal={isSheetOpen ? "true" : undefined}
          aria-label="Table of contents"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b guide-line px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold tracking-[0.12em] text-tech-main/60 uppercase">
                本文目录
              </span>
              <span className="font-mono text-xs text-tech-main/40">·</span>
              <span className="mono-label">{pct}%</span>
            </div>

            <div className="mx-4 h-0.5 flex-1 bg-tech-main/15">
              <div
                className="h-full bg-tech-main transition-[width] duration-150"
                style={{ width: `${pct}%` }}
              />
            </div>

            <button
              type="button"
              onClick={closeSheet}
              className="cursor-pointer px-3 py-2 font-mono text-xs font-bold tracking-[0.15em] text-tech-main uppercase transition-colors hover:bg-tech-main/10"
              aria-label="Close table of contents"
            >
              CLOSE
            </button>
          </div>

          {/* TOC list */}
          <ul className="flex-1 overflow-y-auto px-4 py-3">
            {toc.map((item) => {
              const isActive = item.id === activeHeadingId
              return (
                <li key={item.id}>
                  <Link
                    href={`#${item.id}`}
                    onClick={closeSheet}
                    className={`block border-l-[3px] py-2.5 pr-2 pl-4 text-sm/snug transition-all duration-200 ${isActive
                      ? "border-tech-main font-semibold text-tech-main"
                      : "border-transparent text-tech-main/60 hover:border-tech-main/30 hover:text-tech-main"
                      }`}
                  >
                    {item.text}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </>
  )
}
