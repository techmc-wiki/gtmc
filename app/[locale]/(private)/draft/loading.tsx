import { PageSkeleton } from "@/components/layout/page-skeleton"
import { SectionTitle } from "@/components/ui/headings"
import { TechCard } from "@/components/ui/tech-card"
import {
  SegmentedBar,
  ScanConfirmOverlay,
} from "@/components/ui/loading-shell-primitives"

function DraftRowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${compact ? "p-4 sm:px-5" : "p-5 sm:p-6"}`}>
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-2">
          <SegmentedBar opacity="medium" className="h-6 w-20" />
          <SegmentedBar opacity="high" className="h-6 w-20" />
          <SegmentedBar opacity="low" className="h-4 w-28" />
        </div>
        <SegmentedBar opacity="high" className="h-7 w-3/5" />
        <SegmentedBar opacity="medium" className="mt-3 h-4 w-24" />
      </div>
      <SegmentedBar
        opacity={compact ? "medium" : "high"}
        className="border-tech-main/30 h-11 w-full border sm:w-40"
      />
    </div>
  )
}

export default function DraftLoading() {
  return (
    <PageSkeleton label="Loading drafts">
      <div className="border-tech-main-dark relative border-b-2 pb-6">
        <ScanConfirmOverlay />
        <div className="bg-tech-signal absolute -bottom-0.5 left-0 h-0.5 w-16" />
        <SegmentedBar opacity="low" className="mb-3 h-3 w-40" />
        <SegmentedBar opacity="high" className="h-12 w-64 max-w-full" />
      </div>
      <div className="max-w-2xl space-y-2">
        <SegmentedBar opacity="medium" className="h-4 w-full" />
        <SegmentedBar opacity="low" className="h-4 w-2/3" />
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="animate-tech-slide-in min-w-0 motion-reduce:animate-none lg:col-start-1 lg:row-start-1">
          <SectionTitle className="mb-4">In progress</SectionTitle>
          <div className="space-y-4">
            {[1, 2].map((item) => (
              <TechCard
                key={item}
                tone="main"
                borderOpacity="muted"
                background="default"
                padding="none"
                hover="none"
                brackets="hidden">
                <DraftRowSkeleton />
              </TechCard>
            ))}
          </div>
        </section>
        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <TechCard
            tone="main"
            borderOpacity="medium"
            background="subtle"
            padding="default"
            hover="none"
            brackets="visible"
            bracketVariant="static"
            className="border-t-tech-signal border-t-2">
            <SegmentedBar opacity="low" className="h-3 w-24" />
            <SegmentedBar opacity="high" className="mt-3 h-7 w-4/5" />
            <div className="mt-4 space-y-2">
              <SegmentedBar opacity="medium" className="h-4 w-full" />
              <SegmentedBar opacity="low" className="h-4 w-3/4" />
            </div>
            <div className="mt-6 space-y-3">
              <SegmentedBar
                opacity="high"
                className="border-tech-main/30 h-11 w-full border"
              />
              <SegmentedBar
                opacity="medium"
                className="border-tech-main/30 h-11 w-full border"
              />
            </div>
          </TechCard>
        </aside>
        <section className="animate-tech-slide-in min-w-0 [animation-delay:100ms] motion-reduce:animate-none lg:col-start-1 lg:row-start-2">
          <SectionTitle className="mb-4">Past work</SectionTitle>
          <TechCard
            tone="main"
            borderOpacity="subtle"
            background="ghost"
            padding="none"
            hover="none"
            brackets="hidden">
            <DraftRowSkeleton compact />
          </TechCard>
        </section>
      </div>
    </PageSkeleton>
  )
}
