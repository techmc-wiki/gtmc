"use client"

import { useEffect } from "react"
import { BrutalCard } from "@/components/ui/brutal-card"
import {
  SectionRail,
  SegmentedBar,
  ScanConfirmOverlay,
  SkeletonExitWrapper,
} from "../features/loading-shell-primitives"

export default function DraftLoading() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <SkeletonExitWrapper>
      <div
        className="mx-auto max-w-6xl space-y-8 px-6"
        aria-busy="true"
        aria-label="Loading drafts">
        {/* PAGE_HEADER_ */}
        <div
          className="
            relative flex animate-tech-slide-in flex-col items-start
            justify-between gap-4 border-b border-tech-main/40 pb-6
            md:flex-row md:items-end
          ">
          <ScanConfirmOverlay />
          <div
            className="
              w-full
              md:w-auto
            ">
            <SectionRail label="OPS_CENTER" />
            <SegmentedBar
              opacity="high"
              className="mt-2 h-10 w-64 border-b border-tech-main/40"
            />
            <SegmentedBar opacity="low" className="mt-2 h-4 w-80" />
          </div>
          <div
            className="
              w-full
              md:w-auto
            ">
            <SegmentedBar
              opacity="high"
              className="
                h-10 w-full border border-tech-main/40
                md:w-48
              "
            />
          </div>
        </div>

        {/* ACTIVE_RECORDS_ */}
        <div className="animate-tech-slide-in [animation-delay:100ms]">
          <h2
            className="
              mb-6 border-b guide-line pb-2 text-lg font-bold tracking-widest
              text-tech-main-dark uppercase
              md:text-xl
            ">
            Active Records
          </h2>
          <div
            className="
              grid grid-cols-1 gap-6
              md:grid-cols-2
              lg:grid-cols-3
            ">
            {[1, 2, 3].map((i) => (
              <BrutalCard
                key={i}
                className="
                  flex h-auto flex-col justify-between border
                  border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm
                  sm:h-64
                ">
                {/* Status badge + date row */}
                <div className="mb-4 flex items-start justify-between gap-2">
                  <SegmentedBar
                    opacity="high"
                    className="
                      h-6 w-20 border border-yellow-200/50 bg-yellow-100/50
                    "
                  />
                  <SegmentedBar opacity="medium" className="h-5 w-24" />
                </div>

                {/* Title block */}
                <div className="mb-4 border-l-2 border-tech-main/40 pl-3">
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
                    className="h-11 w-full border border-tech-main/40"
                  />
                </div>
              </BrutalCard>
            ))}
          </div>
        </div>

        {/* ARCHIVED_RECORDS_ */}
        <div className="animate-tech-slide-in [animation-delay:200ms]">
          <h2
            className="
              mb-6 border-b guide-line pb-2 text-lg font-bold tracking-widest
              text-tech-main-dark uppercase
              md:text-xl
            ">
            Archived / Approved Records
          </h2>
          <div
            className="
              grid grid-cols-1 gap-6
              md:grid-cols-2
              lg:grid-cols-3
            ">
            {[1, 2].map((i) => (
              <BrutalCard
                key={i}
                className="
                  flex h-auto flex-col justify-between border
                  border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm
                  sm:h-64
                ">
                {/* Status badge + date row */}
                <div className="mb-4 flex items-start justify-between gap-2">
                  <SegmentedBar
                    opacity="high"
                    className="
                      h-6 w-24 border border-green-200/50 bg-green-100/50
                    "
                  />
                  <SegmentedBar opacity="medium" className="h-5 w-24" />
                </div>

                {/* Title block */}
                <div className="mb-4 border-l-2 border-tech-main/40 pl-3">
                  <SegmentedBar opacity="high" className="mb-2 h-6 w-full" />
                  <SegmentedBar opacity="medium" className="h-6 w-2/3" />
                </div>

                {/* Action button */}
                <div className="mt-auto pt-4">
                  <SegmentedBar
                    opacity="low"
                    className="h-11 w-full border border-tech-main/40"
                  />
                </div>
              </BrutalCard>
            ))}
          </div>
        </div>
      </div>
    </SkeletonExitWrapper>
  )
}
