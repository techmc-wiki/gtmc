import { SectionFrame, SectionRail, SegmentedBar, SweepOverlay, ScanConfirmOverlay } from "../loading-shell-primitives";

export default function FeatureDetailLoading() {
  return (
    <div
      className="container mx-auto p-4 md:p-8 space-y-8 max-w-5xl"
      aria-busy="true"
      aria-label="Loading feature details"
    >
      {/* FEATURE_HEADER_ */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 animate-tech-slide-in relative">
        <ScanConfirmOverlay />
        <div className="space-y-2">
          <SectionRail label="FEATURE_HEADER" />
          <SegmentedBar opacity="high" className="w-64 h-8" />
        </div>
        <SegmentedBar opacity="medium" className="w-32 h-10" />
      </div>

      {/* ISSUE_METADATA_ */}
      <SectionFrame
        showBrackets
        className="animate-tech-slide-in"
        style={{ animationDelay: "100ms" }}
      >
        <SectionRail label="ISSUE_METADATA" />
        <div className="flex flex-col gap-3 font-mono text-sm mt-4">
          <SegmentedBar opacity="high" className="w-64 h-4" />
          <SegmentedBar opacity="medium" className="w-56 h-4" />
          <SegmentedBar opacity="high" className="w-60 h-4" />
          <SegmentedBar opacity="medium" className="w-52 h-4" />
          <SegmentedBar opacity="low" className="w-48 h-4" />
        </div>
      </SectionFrame>

      {/* RESOLUTION_BLOCK_ */}
      <SectionFrame
        className="relative border-l-4 border-tech-main/60 bg-tech-accent/5 animate-tech-slide-in"
        style={{ animationDelay: "200ms" }}
      >
        <SweepOverlay />
        <SectionRail label="RESOLUTION_BLOCK" />
        <div className="space-y-2 mt-4">
          <SegmentedBar opacity="high" className="w-40 h-5" />
          <SegmentedBar opacity="medium" className="w-full h-3" />
          <SegmentedBar opacity="low" className="w-5/6 h-3" />
        </div>
      </SectionFrame>

      {/* EDITOR_BUFFER_ */}
      <SectionFrame
        showBrackets
        className="animate-tech-slide-in"
        style={{ animationDelay: "300ms" }}
      >
        <SectionRail label="EDITOR_BUFFER" />

        <div className="flex flex-col space-y-6 mt-4">
          {/* Title */}
          <div className="flex flex-col space-y-2">
            <div className="font-mono text-xs text-tech-main uppercase tracking-wider">Title_</div>
            <SegmentedBar opacity="high" className="w-full h-10" />
          </div>

          {/* Tags */}
          <div className="flex flex-col space-y-2">
            <div className="font-mono text-xs text-tech-main uppercase tracking-wider">Tags_</div>
            <SegmentedBar opacity="medium" className="w-full h-10" />
          </div>

          {/* Editor area with toolbar */}
          <div className="flex flex-col min-h-[300px] border border-tech-main/40 bg-white/80">
            {/* Toolbar strip */}
            <div className="bg-tech-main h-10 border-b border-tech-main/40 flex items-center gap-2 px-3">
              <SegmentedBar opacity="high" className="w-8 h-6" />
              <div className="w-px h-6 bg-tech-accent/30" />
              <SegmentedBar opacity="medium" className="w-8 h-6" />
              <div className="w-px h-6 bg-tech-accent/30" />
              <SegmentedBar opacity="medium" className="w-8 h-6" />
            </div>

            {/* Text buffer */}
            <div className="flex-1 p-4 space-y-2">
              <SegmentedBar opacity="high" className="w-full h-3" />
              <SegmentedBar opacity="medium" className="w-5/6 h-3" />
              <SegmentedBar opacity="low" className="w-4/5 h-3" />
              <SegmentedBar opacity="low" className="w-3/4 h-3" />
            </div>
          </div>

          {/* Save button */}
          <SegmentedBar opacity="high" className="w-24 h-10" />
        </div>
      </SectionFrame>

      {/* DISCUSSION_LOG_ */}
      <div className="space-y-6 animate-tech-slide-in" style={{ animationDelay: "400ms" }}>
        <SectionRail label="DISCUSSION_LOG" />

        {/* Comment cards */}
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <SectionFrame key={i}>
              <div className="flex items-center gap-2 pb-2 border-b border-dashed border-tech-main/40">
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
        <SectionFrame>
          <div className="font-mono text-xs text-tech-main uppercase tracking-wider mb-3">
            New_Comment_
          </div>
          <SegmentedBar opacity="medium" className="w-full h-24 mb-4" />
          <SegmentedBar opacity="high" className="w-24 h-10" />
        </SectionFrame>
      </div>
    </div>
  );
}
