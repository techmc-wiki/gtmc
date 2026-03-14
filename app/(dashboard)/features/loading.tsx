import { BrutalCard } from "@/components/ui/brutal-card";

export default function FeaturesLoading() {
  return (
    <div
      className="container mx-auto p-4 md:p-8 space-y-6 max-w-5xl"
      aria-busy="true"
      aria-label="Loading features list"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="h-10 w-64 bg-tech-accent/20 animate-pulse border-b-2 border-tech-main/30 inline-block"></div>
          <div className="h-4 w-80 bg-tech-accent/10 animate-pulse mt-2"></div>
        </div>

        <div className="h-10 w-48 bg-tech-accent/20 animate-pulse border border-tech-main/30"></div>
      </div>

      <div className="mt-8 pt-4">
        <BrutalCard className="p-4 bg-white/60 backdrop-blur-sm border-tech-main/30 md:px-6 mb-8">
          <div className="space-y-4">
            <div>
              <div className="h-4 w-40 bg-tech-accent/20 animate-pulse mb-2"></div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-24 bg-tech-accent/10 animate-pulse border border-tech-main/20"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </BrutalCard>

        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="mb-8">
              {i === 1 && (
                <div className="h-6 w-48 bg-tech-accent/20 animate-pulse mb-4 border-l-4 border-tech-main/30"></div>
              )}
              <div className="grid gap-4">
                <BrutalCard className="p-4 bg-white/60 backdrop-blur-sm border-tech-main/30 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="space-y-2 flex-grow w-full">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-24 bg-yellow-100/50 animate-pulse border border-yellow-200/50"></div>
                      <div className="h-6 w-64 bg-tech-accent/20 animate-pulse"></div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <div className="h-5 w-40 bg-zinc-100/50 animate-pulse border border-zinc-200/50"></div>
                      <div className="h-5 w-32 bg-zinc-100/50 animate-pulse border border-zinc-200/50"></div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      <div className="h-5 w-20 bg-tech-accent/10 animate-pulse border border-tech-main/20"></div>
                      <div className="h-5 w-24 bg-tech-accent/10 animate-pulse border border-tech-main/20"></div>
                    </div>
                  </div>
                </BrutalCard>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
