import { SectionFrame, SegmentedBar, ScanConfirmOverlay, SkeletonExitWrapper } from "../loading-shell-primitives";
import { BrutalCard } from "@/components/ui/brutal-card";

export default function FeatureDetailLoading() {
  return (
    <SkeletonExitWrapper>
      <div
        className="container mx-auto p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl"
        aria-busy="true"
        aria-label="Loading feature details"
      >
      {/* FEATURE_HEADER_ */}
      <div className="flex flex-col gap-4 animate-tech-slide-in relative">
        <ScanConfirmOverlay />
        <div>
          <SegmentedBar opacity="high" className="w-64 h-8" />
        </div>
      </div>

      {/* ISSUE_METADATA_ */}
      <BrutalCard className="animate-tech-slide-in" style={{ animationDelay: "100ms" }}>
        <div className="flex flex-col gap-2 font-mono text-xs sm:text-sm">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <span className="font-bold text-zinc-500 sm:w-24">STATUS:</span>
            <SegmentedBar opacity="high" className="w-32 h-4" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <span className="font-bold text-zinc-500 sm:w-24">AUTHOR:</span>
            <SegmentedBar opacity="medium" className="w-40 h-4" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <span className="font-bold text-zinc-500 sm:w-24">ASSIGNEE:</span>
            <SegmentedBar opacity="medium" className="w-40 h-4" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <span className="font-bold text-zinc-500 sm:w-24">CREATED:</span>
            <SegmentedBar opacity="low" className="w-36 h-4" />
          </div>
        </div>
      </BrutalCard>

      {/* RESOLUTION_BLOCK_ */}
      <BrutalCard className="border-tech-accent/40 bg-tech-accent/5 backdrop-blur-sm relative overflow-hidden animate-tech-slide-in" style={{ animationDelay: "200ms" }}>
        <div className="absolute top-0 left-0 w-2 h-full bg-tech-accent/60"></div>
        <div className="flex justify-between items-start mb-4 border-b border-tech-accent/40 pb-2 pl-4">
          <div className="w-40 h-5">
            <SegmentedBar opacity="high" className="w-full h-full" />
          </div>
        </div>
        <div className="space-y-2 pl-4">
          <SegmentedBar opacity="medium" className="w-full h-3" />
          <SegmentedBar opacity="low" className="w-5/6 h-3" />
        </div>
      </BrutalCard>

      {/* EDITOR_BUFFER_ */}
      <div className="flex flex-col space-y-6 w-full p-4 sm:p-6 border border-tech-main bg-white/80 backdrop-blur-sm relative group animate-tech-slide-in" style={{ animationDelay: "300ms" }}>
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-tech-main/40 -translate-x-[1px] -translate-y-[1px] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-tech-main/40 translate-x-[1px] -translate-y-[1px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-tech-main/40 -translate-x-[1px] translate-y-[1px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-tech-main/40 translate-x-[1px] translate-y-[1px] pointer-events-none"></div>

        <div className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-mono uppercase tracking-[0.2em] text-tech-main border-b border-tech-main/30 inline-block pb-1 mb-2">
              TITLE_
            </label>
            <SegmentedBar opacity="high" className="w-full h-10" />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-mono uppercase tracking-[0.2em] text-tech-main border-b border-tech-main/30 inline-block pb-1 mb-2">
              TAGS_ (comma separated)
            </label>
            <SegmentedBar opacity="medium" className="w-full h-10" />
          </div>
        </div>

        <div className="flex flex-col grow min-h-125 border border-tech-main/40 bg-white/80 backdrop-blur-sm relative">
          <div className="bg-tech-main text-white/90 p-2 flex flex-wrap gap-1 sm:gap-2 items-center sticky top-0 z-10 font-mono text-xs border-b border-tech-main/40 px-2 sm:px-4 h-10">
            <SegmentedBar opacity="high" className="w-8 h-6" />
            <div className="w-px h-6 bg-white/30" />
            <SegmentedBar opacity="medium" className="w-8 h-6" />
            <div className="w-px h-6 bg-white/30" />
            <SegmentedBar opacity="medium" className="w-8 h-6" />
          </div>

          <div className="flex-1 p-6 space-y-2">
            <SegmentedBar opacity="high" className="w-full h-3" />
            <SegmentedBar opacity="medium" className="w-5/6 h-3" />
            <SegmentedBar opacity="low" className="w-4/5 h-3" />
            <SegmentedBar opacity="low" className="w-3/4 h-3" />
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-tech-main/10 relative">
          <div className="absolute top-0 right-0 w-8 h-px bg-tech-main"></div>
          <SegmentedBar opacity="high" className="w-24 h-10" />
        </div>
      </div>

       {/* DISCUSSION_LOG_ */}
       <div className="space-y-6 animate-tech-slide-in" style={{ animationDelay: "400ms" }}>
         <h3 className="text-2xl font-bold tracking-tighter uppercase border-b-2 border-tech-main pb-2 inline-block">
           Discussions
         </h3>

         {/* Comment cards */}
         <div className="space-y-4">
           {[1, 2].map((i) => (
             <SectionFrame key={i} className="p-6">
               <div className="flex items-center gap-2 mb-2 pb-2 border-b border-dashed border-tech-main/30 text-sm font-mono">
                 <SegmentedBar opacity="high" className="w-32 h-4" />
                 <SegmentedBar opacity="medium" className="w-40 h-4" />
               </div>
               <div className="space-y-2 mt-3">
                 <SegmentedBar opacity="medium" className="w-full h-3" />
                 <SegmentedBar opacity="low" className="w-5/6 h-3" />
               </div>
             </SectionFrame>
           ))}
         </div>

         {/* Comment form */}
         <SectionFrame className="p-6">
           <label className="text-sm font-mono uppercase tracking-[0.2em] text-tech-main border-b border-tech-main/40 inline-block pb-1 mb-4">
             LEAVE_A_REPLY_
           </label>
           <SegmentedBar opacity="medium" className="w-full h-24 mb-4" />
           <div className="flex justify-end">
             <SegmentedBar opacity="high" className="w-24 h-10" />
           </div>
         </SectionFrame>
       </div>
      </div>
    </SkeletonExitWrapper>
  );
}
