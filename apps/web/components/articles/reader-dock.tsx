"use client"

import { useCallback } from "react"
import { ArrowUpIcon } from "lucide-react"
import { SITE_SCROLL_ROOT_ID } from "@/hooks/site-scroll-root"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"

const RING_RADIUS = 16
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

interface ReaderDockProps {
  /** Reading progress, 0-100. */
  pct: number
  visible: boolean
  /** Current section title; omit to render only the ring action. */
  sectionLabel?: string | null
  children?: React.ReactNode
}

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
      ?.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      })
  }, [])

  const dashOffset = RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, pct / 100)))

  return (
    <div
      inert={!visible}
      data-open={visible}
      className="t-panel-slide border-tech-main/20 bg-surface-overlay/95 backdrop-blur-sm fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex items-stretch border [--panel-translate-y:8px] xl:hidden">
      <Button variant="ghost" size="icon"
        type="button"
        onClick={scrollToTop}
        aria-label={t("backToTopPct", { pct })}
        className="relative">
        <svg
          viewBox="0 0 36 36"
          aria-hidden="true"
          className="absolute inset-0 size-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2"
            className="stroke-tech-main/20"
          />
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2"
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
      </Button>

      {sectionLabel ? (
        <div className="border-tech-main/20 flex min-w-0 items-center border-l">
          {children}
        </div>
      ) : null}
    </div>
  )
}
