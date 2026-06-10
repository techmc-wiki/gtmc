import dynamic from "next/dynamic"
import type { ConflictBlockProps } from "@/components/review/conflict-block"

export type { ConflictBlockProps }

export const ConflictBlockDynamic = dynamic<ConflictBlockProps>(
  () =>
    import("@/components/review/conflict-block").then(
      (mod) => mod.ConflictBlock
    ),
  {
    ssr: false,
    loading: () => (
      <div className="my-4 animate-pulse border border-l-4 border-red-500/50">
        <div className="h-8 w-full bg-red-500/10" />
        <div className="flex">
          <div className="flex-1 space-y-2 p-4">
            <div className="h-4 w-24 rounded bg-amber-500/10" />
            <div className="h-24 rounded bg-amber-500/5" />
          </div>
          <div className="w-px bg-red-500/20" />
          <div className="flex-1 space-y-2 p-4">
            <div className="h-4 w-24 rounded bg-blue-500/10" />
            <div className="h-24 rounded bg-blue-500/5" />
          </div>
        </div>
        <div className="flex h-11 border-t border-red-500/20">
          <div className="flex-1 bg-amber-500/5" />
          <div className="flex-1 bg-blue-500/5" />
        </div>
      </div>
    ),
  }
)
