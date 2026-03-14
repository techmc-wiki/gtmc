import { BrutalCard } from "@/components/ui/brutal-card";

export default function FeatureDetailLoading() {
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-26l" aria-busy="true" aria-label="Loading feature details">
      {/* Title/Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="h-10 w-48 bg-tech-accent animate-pulse rounded"></div>
        </div>
        <div className="h-10 w-32 bg-tech-accent animate-pulse rounded"></div>
      </div>

      {/* Metadata Card */}
      <BrutalCard className="mb-8">
        <div className="flex flex-col gap-3 font-mono text-sm">
          <div className="h-5 w-64 bg-tech-accent animate-pulse rounded"></div>
          <div className="h-5 w-56 bg-tech-accent animate-pulse rounded"></div>
          <div className="h-5 w-60 bg-tech-accent animate-pulse rounded"></div>
          <div className="h-5 w-52 bg-tech-accent animate-pulse rounded"></div>
          <div className="h-5 w-48 bg-tech-accent animate-pulse rounded"></div>
        </div>
      </BrutalCard>

      {/* Explanation Block */}
      <BrutalCard className="mb-8 border-tech-accent/50 bg-tech-accent/5">
        <div className="flex flex-col gap-3">
          <div className="h-6 w-40 bg-tech-accent animate-pulse rounded"></div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-tech-accent animate-pulse rounded"></div>
            <div className="h-4 w-5/6 bg-tech-accent animate-pulse rounded"></div>
          </div>
        </div>
      </BrutalCard>

      {/* Editor/Content Block (biased toward edit layout) */}
      <div className="pt-4">
        <div className="flex flex-col space-y-6 w-full max-w-5xl mx-auto p-6 md:p-10 border border-tech-main/30 bg-white/60">
          {/* Title input */}
          <div className="flex flex-col space-y-2">
            <div className="h-4 w-20 bg-tech-accent animate-pulse rounded"></div>
            <div className="h-10 w-full bg-tech-accent animate-pulse rounded"></div>
          </div>

          {/* Tags input */}
          <div className="flex flex-col space-y-2">
            <div className="h-4 w-32 bg-tech-accent animate-pulse rounded"></div>
            <div className="h-10 w-full bg-tech-accent animate-pulse rounded"></div>
          </div>

          {/* Editor area */}
          <div className="flex flex-col grow min-h-125 border border-tech-main/30 bg-white/40">
            <div className="bg-tech-main/20 p-2 border-b border-tech-main/30 h-10"></div>
            <div className="flex-1 p-4 space-y-2">
              <div className="h-4 w-full bg-tech-accent animate-pulse rounded"></div>
              <div className="h-4 w-5/6 bg-tech-accent animate-pulse rounded"></div>
              <div className="h-4 w-4/5 bg-tech-accent animate-pulse rounded"></div>
            </div>
          </div>

          {/* Save button */}
          <div className="h-10 w-24 bg-tech-accent animate-pulse rounded"></div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="mt-8 space-y-6">
        <div className="h-8 w-32 bg-tech-accent animate-pulse rounded"></div>

        {/* Comments list */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <BrutalCard key={i} className="p-4 bg-white/60 border-tech-main/30 border">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-dashed border-tech-main/30">
                <div className="h-4 w-32 bg-tech-accent animate-pulse rounded"></div>
                <div className="h-4 w-40 bg-tech-accent animate-pulse rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-tech-accent animate-pulse rounded"></div>
                <div className="h-4 w-5/6 bg-tech-accent animate-pulse rounded"></div>
              </div>
            </BrutalCard>
          ))}
        </div>

        {/* Comment form */}
        <BrutalCard className="p-4 bg-white/60 border-tech-main/30 border">
          <div className="h-4 w-32 bg-tech-accent animate-pulse rounded mb-4"></div>
          <div className="h-24 w-full bg-tech-accent animate-pulse rounded mb-4"></div>
          <div className="h-10 w-24 bg-tech-accent animate-pulse rounded"></div>
        </BrutalCard>
      </div>
    </div>
  );
}
