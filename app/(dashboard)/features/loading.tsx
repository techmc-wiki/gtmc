import { BrutalCard } from "@/components/ui/brutal-card"
import {
  SectionRail,
  SegmentedBar,
  ScanConfirmOverlay,
  SkeletonExitWrapper,
} from "./loading-shell-primitives"

export default function FeaturesLoading() {
  return (
    <SkeletonExitWrapper>
      <div
        className="mx-auto max-w-6xl space-y-8 px-6 pb-12"
        aria-busy="true"
        aria-label="Loading features list">
        <div className="
          relative mt-8 flex animate-tech-slide-in flex-col items-start
          justify-between gap-4 border-b border-tech-main/40 pb-6
          md:flex-row md:items-end
        ">
          <ScanConfirmOverlay />
          <div className="
            w-full
            md:w-auto
          ">
            <SectionRail label="FEATURE_HEADER" />
            <SegmentedBar
              opacity="high"
              className="mt-2 h-10 w-64 border-b border-tech-main/40"
            />
            <SegmentedBar opacity="low" className="mt-2 h-4 w-80" />
          </div>
          <div className="
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

        <div className="space-y-6">
          <BrutalCard
            className="
              animate-tech-slide-in border-tech-main/40 bg-white/80 p-6
              backdrop-blur-sm
            "
            style={{ animationDelay: "100ms" }}>
            <div className="space-y-4">
              <div>
                <h4 className="
                  mb-3 font-mono text-sm tracking-widest text-tech-main
                  uppercase
                ">
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
                <h4 className="
                  mb-3 font-mono text-sm tracking-widest text-tech-main
                  uppercase
                ">
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
              style={{ animationDelay: group.delay }}>
              <div className="mb-8">
                <h2 className="
                  mb-6 border-b border-tech-main/20 pb-2 text-lg font-bold
                  tracking-widest text-tech-main-dark uppercase
                  md:text-xl
                ">
                  {group.label} ({group.cards.length})
                </h2>
                <div className="
                  grid grid-cols-1 gap-6
                  md:grid-cols-2
                  lg:grid-cols-3
                ">
                  {group.cards.map((cardNum) => (
                    <BrutalCard
                      key={cardNum}
                      className="
                        flex h-auto flex-col justify-between border
                        border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm
                        sm:h-64
                      ">
                      {/* Status badge + date row */}
                      <div className="
                        mb-4 flex items-start justify-between gap-2
                      ">
                        <SegmentedBar
                          opacity="high"
                          className="
                            h-6 w-24 border border-yellow-200/50
                            bg-yellow-100/50
                          "
                        />
                        <SegmentedBar
                          opacity="high"
                          className="h-5 w-20"
                        />
                      </div>

                      {/* Title block */}
                      <div className="mb-4">
                        <SegmentedBar
                          opacity="high"
                          className="mb-2 h-6 w-full"
                        />
                        <SegmentedBar
                          opacity="high"
                          className="h-6 w-3/4"
                        />
                      </div>

                      {/* Author/assignee rows */}
                      <div className="my-4 flex flex-col gap-2">
                        <SegmentedBar
                          opacity="medium"
                          className="
                            h-5 w-40 border border-zinc-200/50 bg-zinc-100/50
                          "
                        />
                        <SegmentedBar
                          opacity="medium"
                          className="
                            h-5 w-32 border border-zinc-200/50 bg-zinc-100/50
                          "
                        />
                      </div>

                      {/* Tags row at bottom */}
                      <div className="mt-auto flex flex-wrap gap-1 pt-4">
                        <SegmentedBar
                          opacity="low"
                          className="h-5 w-20 border border-tech-main/20"
                        />
                        <SegmentedBar
                          opacity="low"
                          className="h-5 w-24 border border-tech-main/20"
                        />
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
  )
}
