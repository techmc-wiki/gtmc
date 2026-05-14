"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { TechCard } from "@/components/ui/tech-card"
import { SectionTitle } from "@/components/ui/section-title"
import {
  SectionRail,
  SegmentedBar,
  ScanConfirmOverlay,
  SkeletonExitWrapper,
} from "@/components/ui/loading-shell-primitives"

export default function DraftLoading() {
  const t = useTranslations("CommonA11y")

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <SkeletonExitWrapper>
      <div
        className="page-container"
        aria-busy="true"
        aria-label={t("loadingDrafts")}>
        {/* PAGE_HEADER_ */}
        <div className="animate-tech-slide-in border-tech-main/40 relative flex flex-col items-start justify-between gap-4 border-b pb-6 md:flex-row md:items-end">
          <ScanConfirmOverlay />
          <div className="w-full md:w-auto">
            <SectionRail label="OPS_CENTER" />
            <SegmentedBar
              opacity="high"
              className="border-tech-main/40 mt-2 h-10 w-64 border-b"
            />
            <SegmentedBar opacity="low" className="mt-2 h-4 w-80" />
          </div>
          <div className="w-full md:w-auto">
            <SegmentedBar
              opacity="high"
              className="border-tech-main/40 h-10 w-full border md:w-48"
            />
          </div>
        </div>

        {/* ACTIVE_RECORDS_ */}
        <div className="animate-tech-slide-in [animation-delay:100ms]">
          <SectionTitle>Active Records</SectionTitle>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <TechCard
                key={i}
                className="border-tech-main/40 flex h-auto flex-col justify-between border bg-white/80 p-6 backdrop-blur-sm sm:h-64">
                {/* Status badge + date row */}
                <div className="card-header-row">
                  <SegmentedBar
                    opacity="high"
                    className="h-6 w-20 border border-yellow-200/50 bg-yellow-100/50"
                  />
                  <SegmentedBar opacity="medium" className="h-5 w-24" />
                </div>

                {/* Title block */}
                <div className="border-tech-main/40 mb-4 border-l-2 pl-3">
                  <SegmentedBar opacity="high" className="mb-2 h-6 w-full" />
                  <SegmentedBar opacity="high" className="h-6 w-3/4" />
                </div>

                {/* MOD_LIVE_DB indicator */}
                <div className="my-2">
                  <SegmentedBar opacity="low" className="h-4 w-28" />
                </div>

                {/* Action button */}
                <div className="mt-auto pt-4">
                  <SegmentedBar
                    opacity="medium"
                    className="border-tech-main/40 h-11 w-full border"
                  />
                </div>
              </TechCard>
            ))}
          </div>
        </div>

        {/* ARCHIVED_RECORDS_ */}
        <div className="animate-tech-slide-in [animation-delay:200ms]">
          <SectionTitle>Archived / Approved Records</SectionTitle>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <TechCard
                key={i}
                className="border-tech-main/40 flex h-auto flex-col justify-between border bg-white/80 p-6 backdrop-blur-sm sm:h-64">
                {/* Status badge + date row */}
                <div className="card-header-row">
                  <SegmentedBar
                    opacity="high"
                    className="h-6 w-24 border border-green-200/50 bg-green-100/50"
                  />
                  <SegmentedBar opacity="medium" className="h-5 w-24" />
                </div>

                {/* Title block */}
                <div className="border-tech-main/40 mb-4 border-l-2 pl-3">
                  <SegmentedBar opacity="high" className="mb-2 h-6 w-full" />
                  <SegmentedBar opacity="medium" className="h-6 w-2/3" />
                </div>

                {/* Action button */}
                <div className="mt-auto pt-4">
                  <SegmentedBar
                    opacity="low"
                    className="border-tech-main/40 h-11 w-full border"
                  />
                </div>
              </TechCard>
            ))}
          </div>
        </div>
      </div>
    </SkeletonExitWrapper>
  )
}
