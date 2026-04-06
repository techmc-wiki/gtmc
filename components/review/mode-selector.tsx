"use client"

import { useState } from "react"
import { ConflictMode, ModeAnalysis } from "@/types/review"
import { TechButton } from "@/components/ui/tech-button"
import { CornerBrackets } from "@/components/ui/corner-brackets"

interface ModeSelectorProps {
  modeAnalysis: ModeAnalysis
  onSelectMode: (mode: ConflictMode) => void
  hasConflicts: boolean
  isSelecting?: boolean
}

interface ModeCardConfig {
  mode: ConflictMode
  title: string
  subtitle: string
  detail: string
}

const MODE_CARDS: ModeCardConfig[] = [
  {
    mode: "FINE_GRAINED",
    title: "FINE-GRAINED",
    subtitle: "Rebase simulation. Resolve conflicts commit-by-commit.",
    detail: "Higher precision. Preserves commit history context.",
  },
  {
    mode: "SIMPLE",
    title: "SIMPLE",
    subtitle:
      "Direct comparison. Single merge between your draft and current main.",
    detail: "Faster resolution. Best for small or isolated changes.",
  },
]

export function ModeSelector({
  modeAnalysis,
  onSelectMode,
  hasConflicts,
  isSelecting,
}: ModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<ConflictMode>(
    modeAnalysis.recommendation
  )

  if (!hasConflicts) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="relative border border-tech-main/30 bg-tech-main/5 px-8 py-6 text-center">
          <CornerBrackets color="border-tech-main/30" />
          <div className="mb-2 flex items-center justify-center gap-2">
            <span
              className="inline-block size-2 rounded-full bg-green-500"
              role="img"
              title="No conflicts"
            />
            <span className="font-mono text-xs tracking-widest uppercase text-tech-main">
              STATUS
            </span>
          </div>
          <p className="font-mono text-sm tracking-widest uppercase text-tech-main">
            NO_CONFLICTS_DETECTED_
          </p>
          <p className="mt-2 font-mono text-xs text-tech-main/60">
            All files are clean. No resolution required.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs tracking-widest uppercase text-tech-main/60">
          CONFLICT_RESOLUTION
        </p>
        <h2 className="mt-1 font-mono text-sm tracking-widest uppercase text-tech-main">
          SELECT_MODE_
        </h2>
      </div>

      <div className="border border-tech-main/30 bg-tech-main/5 px-4 py-3">
        <p className="font-mono text-xs tracking-widest uppercase text-tech-main/50 mb-1">
          ANALYSIS
        </p>
        <p className="font-mono text-xs text-tech-main/80 leading-relaxed">
          {modeAnalysis.adminMessage}
        </p>
        <div className="mt-2 flex gap-4">
          <span className="font-mono text-[0.6875rem] tracking-widest uppercase text-tech-main/50">
            COMMITS_{modeAnalysis.commitCount}
          </span>
          <span className="font-mono text-[0.6875rem] tracking-widest uppercase text-tech-main/50">
            FILES_{modeAnalysis.filesAffected}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODE_CARDS.map(({ mode, title, subtitle, detail }) => {
          const isSelected = selectedMode === mode
          const isRecommended = modeAnalysis.recommendation === mode

          return (
            <button
              key={mode}
              type="button"
              onClick={() => setSelectedMode(mode)}
              className={`
                relative group text-left p-4 sm:p-5 transition-all duration-200 cursor-pointer
                ${
                  isSelected
                    ? "border border-tech-main bg-tech-main/10"
                    : "guide-line bg-white/70 hover:border-tech-main/50 hover:bg-white/90"
                }
              `}>
              <CornerBrackets
                color={
                  isSelected ? "border-tech-main/60" : "border-tech-main/30"
                }
              />

              {isRecommended && (
                <span className="inline-block mb-2 bg-tech-main text-white font-mono text-[0.6875rem] tracking-widest uppercase px-2 py-0.5">
                  RECOMMENDED
                </span>
              )}

              <p
                className={`font-mono text-sm tracking-widest uppercase font-bold ${isSelected ? "text-tech-main" : "text-tech-main/80"}`}>
                {title}
              </p>

              <p className="mt-1.5 font-mono text-xs text-tech-main/60 leading-relaxed">
                {subtitle}
              </p>

              <p className="mt-2 font-mono text-[0.6875rem] text-tech-main/40 leading-relaxed">
                {detail}
              </p>

              {isSelected && (
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="inline-block size-1.5 bg-tech-main" />
                  <span className="font-mono text-[0.6875rem] tracking-widest uppercase text-tech-main">
                    SELECTED
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex justify-end">
        <TechButton
          variant="primary"
          size="md"
          disabled={isSelecting}
          onClick={() => onSelectMode(selectedMode)}>
          {isSelecting ? "INITIALIZING..." : "START RESOLUTION"}
        </TechButton>
      </div>
    </div>
  )
}
