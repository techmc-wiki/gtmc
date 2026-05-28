"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import {
  ScanConfirmOverlay,
  SectionFrame,
  SectionRail,
  SegmentedBar,
  SkeletonExitWrapper,
  SweepOverlay,
} from "@/components/ui/loading-shell-primitives"
import { CornerBrackets } from "@/components/ui/corner-brackets"

const ALPHABET_NAV_KEYS = Array.from({ length: 14 }, (_, i) => `alpha-nav-${i}`)

export default function GlossaryLoading() {
  const t = useTranslations("Glossary")

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <SkeletonExitWrapper>
      <div
        className="border-tech-main/40 relative min-h-screen w-full border bg-transparent p-6 pb-32 backdrop-blur-sm sm:p-8"
        aria-busy="true"
        aria-live="polite"
        aria-label={t("pageTitle")}>
        <span className="sr-only">{t("pageTitle")}</span>
        <div aria-hidden="true">
          <CornerBrackets
            size="size-4"
            color="border-tech-main/40"
            corners="diagonal-tlbr"
          />

          <SectionFrame className="animate-tech-slide-in guide-line bg-surface-overlay/80 relative mb-8 flex flex-col gap-4 border p-4 backdrop-blur-sm sm:p-6">
            <ScanConfirmOverlay />
            <SectionRail label="GLOSSARY_INDEX" className="mb-2" />
            <SegmentedBar opacity="medium" className="h-3 w-1/3" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <SegmentedBar opacity="high" className="h-9 flex-1" />
              <SegmentedBar opacity="high" className="h-9 w-28" />
              <SegmentedBar opacity="high" className="h-9 w-28" />
            </div>
            <div className="flex flex-wrap gap-2">
              <SegmentedBar opacity="medium" className="h-7 w-20" />
              <SegmentedBar opacity="low" className="h-7 w-24" />
              <SegmentedBar opacity="low" className="h-7 w-16" />
              <SegmentedBar opacity="low" className="h-7 w-28" />
              <SegmentedBar opacity="low" className="h-7 w-20" />
            </div>
          </SectionFrame>

          <div className="border-tech-line/30 bg-surface-overlay/60 relative mb-6 overflow-hidden border">
            <SweepOverlay />
            <div className="flex">
              {ALPHABET_NAV_KEYS.map((navKey, i) => (
                <SegmentedBar
                  key={navKey}
                  opacity={i % 3 === 0 ? "high" : "low"}
                  className="border-tech-line/20 h-9 flex-1 border-r"
                />
              ))}
            </div>
          </div>

          <SectionFrame className="animate-tech-slide-in relative min-h-[50vh] [animation-delay:100ms]">
            <ScanConfirmOverlay className="opacity-50" />
            <SectionRail label="TERM_BUFFER" className="mb-4" />
            <div className="space-y-3">
              <SegmentedBar opacity="high" className="h-5 w-2/3" />
              <SegmentedBar opacity="medium" className="h-4 w-full" />
              <SegmentedBar opacity="medium" className="h-4 w-11/12" />
              <SegmentedBar opacity="low" className="h-4 w-9/12" />
              <SegmentedBar opacity="high" className="mt-4 h-5 w-1/2" />
              <SegmentedBar opacity="medium" className="h-4 w-full" />
              <SegmentedBar opacity="low" className="h-4 w-10/12" />
              <SegmentedBar opacity="low" className="h-4 w-8/12" />
            </div>
          </SectionFrame>
        </div>
      </div>
    </SkeletonExitWrapper>
  )
}
