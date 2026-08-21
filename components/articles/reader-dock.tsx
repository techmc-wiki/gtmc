"use client"

import { useCallback } from "react"
import { ArrowUpIcon } from "lucide-react"
import { SITE_SCROLL_ROOT_ID } from "@/hooks/site-scroll-root"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/cn"

const RING_RADIUS = 15.5
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

interface ReaderDockProps {
  /** Reading progress, 0-100. */
  pct: number
  visible: boolean
  /** Current section title; omit to render only the ring action. */
  sectionLabel?: string | null
  children?: React.ReactNode
}

/**
 * Bottom-docked reader HUD (mobile): a determinate progress ring wrapped
 * around a back-to-top action, joined to the current-section outline trigger.
 * Unifies what used to be a top strip, a floating pill, and a sheet trigger.
 */
export function ReaderDock({
  pct,
  visible,
  sectionLabel,
  children,
}: ReaderDockProps) {
  const t = useTranslations("Outline")

  const scrollToTop = useCallback(() => {
    document
      .getElementById(SITE_SCROLL_ROOT_ID)
      ?.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const dashOffset = RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, pct / 100)))

  return (
    <div
      className={cn(
        "border-tech-main/20 bg-surface-overlay/95 backdrop-blur-sm fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex items-stretch border transition-all duration-300 xl:hidden",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      )}>
      <button
        type="button"
        onClick={scrollToTop}
        aria-label={t("backToTopPct", { pct })}
        className="relative flex size-11 cursor-pointer items-center justify-center">
        <svg
          viewBox="0 0 36 36"
          aria-hidden="true"
          className="absolute inset-0 size-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2.5"
            className="stroke-tech-main/20"
          />
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="butt"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="stroke-tech-signal transition-[stroke-dashoffset] duration-150 ease-linear"
          />
        </svg>
        <ArrowUpIcon
          className="text-tech-main-dark size-4"
          aria-hidden="true"
        />
      </button>

      {sectionLabel ? (
        <div className="border-tech-main/20 flex min-w-0 items-center border-l">
          {children}
        </div>
      ) : null}
    </div>
  )
}
