import { BrutalCard } from "@/components/ui/brutal-card";
import { SectionRail, SegmentedBar } from "./loading-shell-primitives";

export default function FeaturesLoading() {
  return (
    <div
      className="container mx-auto p-4 md:p-8 space-y-6 max-w-5xl"
      aria-busy="true"
      aria-label="Loading features list"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-tech-slide-in">
        <div>
          <SectionRail label="FEATURE_HEADER" />
          <SegmentedBar opacity="high" className="w-64 h-10 mt-2 border-b-2 border-tech-main/30" />
          <SegmentedBar opacity="low" className="w-80 h-4 mt-2" />
        </div>
        <SegmentedBar opacity="high" className="w-48 h-10 border border-tech-main/30" />
      </div>

      <div className="mt-8 pt-4 space-y-6">
        <BrutalCard
          className="p-4 bg-white/60 backdrop-blur-sm border-tech-main/30 md:px-6 animate-tech-slide-in"
          style={{ animationDelay: "100ms" }}
        >
          <SectionRail label="FILTER_MATRIX" />
          <div className="space-y-4 mt-4">
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
        </BrutalCard>

        {[
          { label: "PENDING", delay: "200ms", cards: [1, 2] },
          { label: "IN_PROGRESS", delay: "300ms", cards: [3, 4] },
          { label: "RESOLVED", delay: "400ms", cards: [5, 6] },
        ].map((group) => (
          <div
            key={group.label}
            className="space-y-4 animate-tech-slide-in"
            style={{ animationDelay: group.delay }}
          >
            <SectionRail label={group.label} />
            {group.cards.map((cardNum) => (
              <BrutalCard
                key={cardNum}
                className="p-4 bg-white/60 backdrop-blur-sm border-tech-main/30 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
              >
                <div className="space-y-2 flex-grow w-full">
                  <div className="flex items-center gap-2">
                    <SegmentedBar
                      opacity="high"
                      className="h-6 w-24 border border-yellow-200/50 bg-yellow-100/50"
                    />
                    <SegmentedBar opacity="high" className="h-6 w-64" />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <SegmentedBar
                      opacity="medium"
                      className="h-5 w-40 border border-zinc-200/50 bg-zinc-100/50"
                    />
                    <SegmentedBar
                      opacity="medium"
                      className="h-5 w-32 border border-zinc-200/50 bg-zinc-100/50"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <SegmentedBar opacity="low" className="h-5 w-20 border border-tech-main/20" />
                    <SegmentedBar opacity="low" className="h-5 w-24 border border-tech-main/20" />
                  </div>
                </div>
              </BrutalCard>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
