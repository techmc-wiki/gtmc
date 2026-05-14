"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { TechCard } from "@/components/ui/tech-card"
import {
  SectionRail,
  SegmentedBar,
  ScanConfirmOverlay,
  SkeletonExitWrapper,
} from "@/components/ui/loading-shell-primitives"

export default function ReviewLoading() {
  const t = useTranslations("CommonA11y")

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <SkeletonExitWrapper>
      <div
        className="page-container"
        aria-busy="true"
        aria-label={t("loadingReviewHub")}>
        {/* PAGE_HEADER_ */}
        <div className="animate-tech-slide-in border-tech-main/40 relative flex flex-col border-b pb-6">
          <ScanConfirmOverlay />
          <div>
            <SectionRail label="REVIEW_HUB" />
            <SegmentedBar
              opacity="high"
              className="border-tech-main/40 mt-2 h-10 w-64 border-b"
            />
            <SegmentedBar opacity="low" className="mt-2 h-4 w-72" />
          </div>
        </div>

        {/* PENDING_REVIEWS_ */}
        <div className="animate-tech-slide-in flex flex-col gap-10 [animation-delay:100ms]">
          <div className="space-y-4">
            <h2 className="border-tech-main/50 text-tech-main border-b-2 pb-2 font-bold tracking-widest uppercase">
              PENDING REVIEWS
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {[1, 2, 3].map((i) => (
                <TechCard
                  key={i}
                  className={`border-tech-main/40 flex flex-col items-start justify-between space-y-4 border bg-white/80 p-6 backdrop-blur-sm md:flex-row md:items-center md:space-y-0`}
                  style={{ animationDelay: `${100 + i * 50}ms` }}>
                  <div className="flex-1">
                    {/* PR badge + date row */}
                    <div className="mb-3 flex items-center gap-3">
                      <SegmentedBar
                        opacity="high"
                        className="h-6 w-20 border border-blue-500/40 bg-blue-500/10"
                      />
                      <SegmentedBar opacity="medium" className="h-5 w-36" />
                    </div>

                    {/* Title */}
                    <div className="border-tech-main/40 mb-2 border-l-2 pl-3">
                      <SegmentedBar
                        opacity="high"
                        className="h-7 w-full md:w-80"
                      />
                    </div>

                    {/* Submitted by */}
                    <div className="mb-3 pl-3">
                      <SegmentedBar opacity="medium" className="h-4 w-44" />
                    </div>

                    {/* Target branch */}
                    <div className="ml-3">
                      <SegmentedBar
                        opacity="low"
                        className="guide-line bg-tech-main/5 h-6 w-48 border"
                      />
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="w-full md:w-auto">
                    <SegmentedBar
                      opacity="high"
                      className="border-tech-main/40 h-11 w-full border md:w-44"
                    />
                  </div>
                </TechCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SkeletonExitWrapper>
  )
}
