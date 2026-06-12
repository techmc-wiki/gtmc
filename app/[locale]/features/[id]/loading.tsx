import { getTranslations } from "next-intl/server"
import {
  SectionFrame,
  SegmentedBar,
  SkeletonExitWrapper,
} from "@/components/ui/loading-shell-primitives"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { TechCard } from "@/components/ui/tech-card"

export default async function FeatureDetailLoading() {
  const t = await getTranslations("CommonA11y")
  return (
    <SkeletonExitWrapper>
      <div
        className="container mx-auto max-w-4xl space-y-6 p-4 sm:p-6 md:p-8"
        aria-busy="true"
        aria-label={t("loadingFeatureDetails")}>
        {/* FEATURE_HEADER_ */}
        <div className="relative flex flex-col gap-4">
          <div>
            <SegmentedBar opacity="high" className="h-8 w-64" />
          </div>
        </div>

        {/* ISSUE_METADATA_ */}
        <TechCard className="">
          <div className="flex flex-col gap-2 font-mono text-xs sm:text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="font-bold text-zinc-500 sm:w-24">STATUS:</span>
              <SegmentedBar opacity="high" className="h-4 w-32" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="font-bold text-zinc-500 sm:w-24">AUTHOR:</span>
              <SegmentedBar opacity="medium" className="h-4 w-40" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="font-bold text-zinc-500 sm:w-24">ASSIGNEE:</span>
              <SegmentedBar opacity="medium" className="h-4 w-40" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="font-bold text-zinc-500 sm:w-24">CREATED:</span>
              <SegmentedBar opacity="low" className="h-4 w-36" />
            </div>
          </div>
        </TechCard>

        {/* RESOLUTION_BLOCK_ */}
        <TechCard className="border-tech-accent/40 bg-tech-accent/5 relative overflow-hidden backdrop-blur-sm">
          <div className="bg-tech-accent/60 absolute top-0 left-0 h-full w-2" />
          <div className="border-tech-accent/40 mb-4 flex items-start justify-between border-b pb-2 pl-4">
            <div className="h-5 w-40">
              <SegmentedBar opacity="high" className="size-full" />
            </div>
          </div>
          <div className="space-y-2 pl-4">
            <SegmentedBar opacity="medium" className="h-3 w-full" />
            <SegmentedBar opacity="low" className="h-3 w-5/6" />
          </div>
        </TechCard>

        {/* EDITOR_BUFFER_ */}
        <div className="group border-tech-main bg-surface-overlay/80 relative flex w-full flex-col space-y-6 border p-4 backdrop-blur-sm sm:p-6">
          <CornerBrackets size="size-2" color="border-tech-main/40" />

          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-2">
              <span className="section-label">TITLE_</span>
              <SegmentedBar opacity="high" className="h-10 w-full" />
            </div>

            <div className="flex flex-col space-y-2">
              <span className="section-label">TAGS_ (comma separated)</span>
              <SegmentedBar opacity="medium" className="h-10 w-full" />
            </div>
          </div>

          <div className="editor-grow border-tech-main/40 bg-surface-overlay/80 relative border backdrop-blur-sm">
            <div className="border-tech-main/40 bg-tech-main-dark text-tech-bg/90 sticky top-0 z-10 flex h-10 flex-wrap items-center gap-1 border-b p-2 px-2 font-mono text-xs sm:gap-2 sm:px-4">
              <SegmentedBar opacity="high" className="h-6 w-8" />
              <div className="bg-surface/30 h-6 w-px" />
              <SegmentedBar opacity="medium" className="h-6 w-8" />
              <div className="bg-surface/30 h-6 w-px" />
              <SegmentedBar opacity="medium" className="h-6 w-8" />
            </div>

            <div className="flex-1 space-y-2 p-6">
              <SegmentedBar opacity="high" className="h-3 w-full" />
              <SegmentedBar opacity="medium" className="h-3 w-5/6" />
              <SegmentedBar opacity="low" className="h-3 w-4/5" />
              <SegmentedBar opacity="low" className="h-3 w-3/4" />
            </div>
          </div>

          <div className="border-tech-main/10 relative mt-6 flex justify-end gap-4 border-t pt-4">
            <div className="corner-tick" />
            <SegmentedBar opacity="high" className="h-10 w-24" />
          </div>
        </div>

        {/* DISCUSSION_LOG_ */}
        <div className="space-y-6">
          <h3 className="border-tech-main inline-block border-b-2 pb-2 text-2xl font-bold tracking-tighter uppercase">
            Discussions
          </h3>

          {/* Comment cards */}
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <SectionFrame key={i} className="p-6">
                <div className="border-tech-main/30 mb-2 flex items-center gap-2 border-b border-dashed pb-2 font-mono text-sm">
                  <SegmentedBar opacity="high" className="h-4 w-32" />
                  <SegmentedBar opacity="medium" className="h-4 w-40" />
                </div>
                <div className="mt-3 space-y-2">
                  <SegmentedBar opacity="medium" className="h-3 w-full" />
                  <SegmentedBar opacity="low" className="h-3 w-5/6" />
                </div>
              </SectionFrame>
            ))}
          </div>

          {/* Comment form */}
          <SectionFrame className="p-6">
            <span className="border-tech-main/40 tracking-tech-wide text-tech-main mb-4 inline-block border-b pb-1 font-mono text-sm uppercase">
              LEAVE_A_REPLY_
            </span>
            <SegmentedBar opacity="medium" className="mb-4 h-24 w-full" />
            <div className="flex justify-end">
              <SegmentedBar opacity="high" className="h-10 w-24" />
            </div>
          </SectionFrame>
        </div>
      </div>
    </SkeletonExitWrapper>
  )
}
