"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import {
  ScanConfirmOverlay,
  SectionFrame,
  SectionRail,
  SegmentedBar,
  SkeletonExitWrapper,
} from "@/components/ui/loading-shell-primitives"
import { CornerBrackets } from "@/components/ui/corner-brackets"

export default function ArticlesLoading() {
  const t = useTranslations("CommonA11y")

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <SkeletonExitWrapper>
      <div
        className="
          relative min-h-screen w-full border border-tech-main/40 bg-transparent
          p-6 pb-32 backdrop-blur-sm
          sm:p-8
        "
        aria-busy="true"
        aria-live="polite"
        aria-label={t("loadingArticleContent")}>
        <span className="sr-only">{t("loadingArticleContent")}</span>
        <div aria-hidden="true">
          <CornerBrackets
            size="size-4"
            color="border-tech-main/40"
            corners="diagonal-tlbr"
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
