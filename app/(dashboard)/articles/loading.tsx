"use client"

import { useEffect } from "react"
import {
  ScanConfirmOverlay,
  SectionFrame,
  SectionRail,
  SegmentedBar,
  SkeletonExitWrapper,
} from "../features/loading-shell-primitives"

export default function ArticlesLoading() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <SkeletonExitWrapper>
      <div
        className="
          relative min-h-screen max-w-3xl border border-tech-main/40
          bg-transparent p-6 pb-32 backdrop-blur-sm
          sm:p-8
        "
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading article content">
        <span className="sr-only">Loading article content</span>
        <div aria-hidden="true">
          <div
            className="
              absolute top-0 left-0 size-4 border-t-2 border-l-2
              border-tech-main/40
            "
          />
          <div
            className="
              absolute right-0 bottom-0 size-4 border-r-2 border-b-2
              border-tech-main/40
            "
          />

          <SectionFrame
            className="
              relative mb-8 flex animate-tech-slide-in flex-col gap-4 border
              guide-line bg-white/80 p-4 backdrop-blur-sm
              sm:p-6
            ">
            <ScanConfirmOverlay />
            <SectionRail label="SYS.READ_STREAM" className="mb-2" />
            <SegmentedBar opacity="medium" className="h-3 w-1/3" />
            <div
              className="
                flex flex-col gap-2
                sm:flex-row sm:items-center sm:gap-4
              ">
              <SegmentedBar opacity="high" className="h-4 w-28" />
              <SegmentedBar opacity="high" className="h-4 w-20" />
            </div>
            <SegmentedBar opacity="high" className="h-10 w-44" />
          </SectionFrame>

          <SectionFrame
            className="
              relative min-h-[50vh] animate-tech-slide-in
              [animation-delay:100ms]
            ">
            <ScanConfirmOverlay className="opacity-50" />
            <SectionRail label="ARTICLE_BUFFER" className="mb-4" />
            <SegmentedBar opacity="high" className="mb-3 h-7 w-2/3" />
            <div className="space-y-3">
              <SegmentedBar opacity="high" className="h-4 w-full" />
              <SegmentedBar opacity="medium" className="h-4 w-11/12" />
              <SegmentedBar opacity="medium" className="h-4 w-10/12" />
              <SegmentedBar opacity="low" className="h-4 w-9/12" />
              <SegmentedBar opacity="low" className="h-4 w-8/12" />
            </div>
          </SectionFrame>
        </div>
      </div>
    </SkeletonExitWrapper>
  )
}
