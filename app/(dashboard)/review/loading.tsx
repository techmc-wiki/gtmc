"use client"

import { useEffect } from "react"
import { BrutalCard } from "@/components/ui/brutal-card"
import {
  SectionRail,
  SegmentedBar,
  ScanConfirmOverlay,
  SkeletonExitWrapper,
} from "../features/loading-shell-primitives"

export default function ReviewLoading() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <SkeletonExitWrapper>
      <div
        className="mx-auto max-w-6xl space-y-8 px-6"
        aria-busy="true"
        aria-label="Loading review hub">
        {/* PAGE_HEADER_ */}
        <div
          className="
            relative flex animate-tech-slide-in flex-col border-b
            border-tech-main/40 pb-6
          ">
          <ScanConfirmOverlay />
          <div>
            <SectionRail label="REVIEW_HUB" />
            <SegmentedBar
              opacity="high"
              className="mt-2 h-10 w-64 border-b border-tech-main/40"
            />
            <SegmentedBar opacity="low" className="mt-2 h-4 w-72" />
          </div>
        </div>

        {/* PENDING_REVIEWS_ */}
        <div
          className="
            flex animate-tech-slide-in flex-col gap-10 [animation-delay:100ms]
          ">
          <div className="space-y-4">
            <h2
              className="
                border-b-2 border-tech-main/50 pb-2 font-bold tracking-widest
                text-tech-main uppercase
              ">
              PENDING REVIEWS
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {[1, 2, 3].map((i) => (
                <BrutalCard
                  key={i}
                  className={`
                    flex flex-col items-start justify-between space-y-4 border
                    border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm
                    md:flex-row md:items-center md:space-y-0
                  `}
                  style={{ animationDelay: `${100 + i * 50}ms` }}>
                  <div className="flex-1">
                    {/* PR badge + date row */}
                    <div className="mb-3 flex items-center gap-3">
                      <SegmentedBar
                        opacity="high"
                        className="
                          h-6 w-20 border border-blue-500/40 bg-blue-500/10
                        "
                      />
                      <SegmentedBar opacity="medium" className="h-5 w-36" />
                    </div>

                    {/* Title */}
                    <div className="mb-2 border-l-2 border-tech-main/40 pl-3">
                      <SegmentedBar
                        opacity="high"
                        className="
                          h-7 w-full
                          md:w-80
                        "
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
                        className="h-6 w-48 border guide-line bg-tech-main/5"
                      />
                    </div>
                  </div>

                  {/* Action button */}
                  <div
                    className="
                      w-full
                      md:w-auto
                    ">
                    <SegmentedBar
                      opacity="high"
                      className="
                        h-11 w-full border border-tech-main/40
                        md:w-44
                      "
                    />
                  </div>
                </BrutalCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SkeletonExitWrapper>
  )
}
