import { PageSkeleton } from "@/components/layout/page-skeleton"
import {
  SectionFrame,
  SectionRail,
  SegmentedBar,
} from "@/components/ui/loading-shell-primitives"

const ALPHABET_NAV_KEYS = Array.from({ length: 14 }, (_, i) => `alpha-nav-${i}`)

export default function GlossaryLoading() {
  return (
    <PageSkeleton label="Loading glossary" framed>
      <SectionFrame className="animate-tech-slide-in guide-line bg-surface-overlay/80 relative mb-8 flex flex-col gap-4 border p-4 backdrop-blur-sm sm:p-6">
        <SectionRail label="Loading glossary" className="mb-2" />
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
        <div className="flex">
          {ALPHABET_NAV_KEYS.map((key, i) => (
            <SegmentedBar
              key={key}
              opacity={i % 3 === 0 ? "high" : "low"}
              className="border-tech-line/20 h-9 flex-1 border-r"
            />
          ))}
        </div>
      </div>
      <SectionFrame className="animate-tech-slide-in relative min-h-[50vh] [animation-delay:100ms]">
        <SectionRail label="Loading terms" className="mb-4" />
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
    </PageSkeleton>
  )
}
