import { BrutalCard } from "@/components/ui/brutal-card";
import { SectionRail, SegmentedBar, ScanConfirmOverlay, SkeletonExitWrapper } from "./loading-shell-primitives";

export default function FeaturesLoading() {
  return (
    <SkeletonExitWrapper>
      <div
        className="max-w-6xl mx-auto space-y-8 px-6 pb-12"
        aria-busy="true"
        aria-label="Loading features list"
      >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-tech-main/40 pb-6 relative gap-4 mt-8 animate-tech-slide-in">
        <ScanConfirmOverlay />
        <div className="w-full md:w-auto">
          <SectionRail label="FEATURE_HEADER" />
          <SegmentedBar opacity="high" className="w-64 h-10 mt-2 border-b border-tech-main/40" />
          <SegmentedBar opacity="low" className="w-80 h-4 mt-2" />
        </div>
        <div className="w-full md:w-auto">
          <SegmentedBar opacity="high" className="w-full md:w-48 h-10 border border-tech-main/40" />
        </div>
      </div>

      <div className="space-y-6">
        <BrutalCard
          className="p-6 bg-white/80 backdrop-blur-sm border-tech-main/40 animate-tech-slide-in"
          style={{ animationDelay: "100ms" }}
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-mono uppercase tracking-widest text-tech-main mb-3">
                FILTER_BY_STATUS_
              </h4>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <SegmentedBar
                    key={i}
                    opacity="low"
                    className="h-8 w-24 border border-tech-main/20"
                  />
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-mono uppercase tracking-widest text-tech-main mb-3">
                FILTER_BY_TAGS_
              </h4>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((i) => (
                  <SegmentedBar
                    key={i}
                    opacity="low"
                    className="h-8 w-20 border border-tech-main/20"
                  />
                ))}
              </div>
            </div>
          </div>
        </BrutalCard>

        {[
          { label: "PENDING", delay: "200ms", cards: [1, 2] },
          { label: "IN_PROGRESS", delay: "300ms", cards: [3, 4] },
          { label: "RESOLVED", delay: "400ms", cards: [5, 6] },
        ].map((group) => (
          <div
            key={group.label}
            className="animate-tech-slide-in"
            style={{ animationDelay: group.delay }}
          >
            <div className="mb-8">
              <h2 className="text-lg md:text-xl font-bold tracking-widest uppercase mb-6 border-b border-tech-main/20 pb-2 text-tech-main-dark">
                {group.label} ({group.cards.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.cards.map((cardNum) => (
                  <BrutalCard
                    key={cardNum}
                    className="flex flex-col h-auto sm:h-64 justify-between border border-tech-main/40 bg-white/80 backdrop-blur-sm p-6"
                  >
                    {/* Status badge + date row */}
                    <div className="flex justify-between items-start mb-4 gap-2">
                      <SegmentedBar
                        opacity="high"
                        className="h-6 w-24 border border-yellow-200/50 bg-yellow-100/50"
                      />
                      <SegmentedBar opacity="high" className="h-5 w-20" />
                    </div>

                    {/* Title block */}
                    <div className="mb-4">
                      <SegmentedBar opacity="high" className="h-6 w-full mb-2" />
                      <SegmentedBar opacity="high" className="h-6 w-3/4" />
                    </div>

                    {/* Author/assignee rows */}
                    <div className="mt-4 flex flex-col gap-2 mb-4">
                      <SegmentedBar
                        opacity="medium"
                        className="h-5 w-40 border border-zinc-200/50 bg-zinc-100/50"
                      />
                      <SegmentedBar
                        opacity="medium"
                        className="h-5 w-32 border border-zinc-200/50 bg-zinc-100/50"
                      />
                    </div>

                    {/* Tags row at bottom */}
                    <div className="flex flex-wrap gap-1 mt-auto pt-4">
                      <SegmentedBar opacity="low" className="h-5 w-20 border border-tech-main/20" />
                      <SegmentedBar opacity="low" className="h-5 w-24 border border-tech-main/20" />
                    </div>
                  </BrutalCard>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </SkeletonExitWrapper>
  );
}
