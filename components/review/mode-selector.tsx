"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ConflictMode, ModeAnalysis } from "@/types/review"
import { TechButton } from "@/components/ui/tech-button"
import { CornerBrackets } from "@/components/ui/corner-brackets"

interface ModeSelectorProps {
  modeAnalysis: ModeAnalysis
  onSelectMode: (mode: ConflictMode) => void
  hasConflicts: boolean
  isSelecting?: boolean
}

export function ModeSelector({
  modeAnalysis,
  onSelectMode,
  hasConflicts,
  isSelecting,
}: ModeSelectorProps) {
  const t = useTranslations("Review")
  const homepageT = useTranslations("Homepage")
  const [selectedMode, setSelectedMode] = useState<ConflictMode>(
    modeAnalysis.recommendation
  )
  const modeCards = [
    {
      mode: "FINE_GRAINED" as ConflictMode,
      title: t("modeFineGrained"),
      subtitle: t("modeFineGrainedDesc"),
      detail: t("modeFineGrainedDetail"),
    },
    {
      mode: "SIMPLE" as ConflictMode,
      title: t("modeSimple"),
      subtitle: t("modeSimpleDesc"),
      detail: t("modeSimpleDetail"),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {!hasConflicts && (
        <div className="relative border border-green-500/30 bg-green-500/5 px-4 py-3">
          <CornerBrackets color="border-green-500/30" />
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-2 bg-green-500"
              role="img"
              title="No conflicts"
            />
            <span className="font-mono text-xs tracking-widest text-green-700 uppercase">
              {t("noConflicts")}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-green-700/70">
            {t("allFilesClean")}
          </p>
        </div>
      )}

      <div>
        <p className="font-mono text-xs tracking-widest text-tech-main/60 uppercase">
          {t("conflictResolution")}
        </p>
        <h2 className="mt-1 font-mono text-sm tracking-widest text-tech-main uppercase">
          {t("selectMode")}
        </h2>
      </div>

      <div className="border border-tech-main/30 bg-tech-main/5 px-4 py-3">
        <p className="mb-2 mono-label tracking-widest uppercase">
          {t("analysis")}
        </p>
        <p className="font-mono text-xs/relaxed text-tech-main/80">
          {modeAnalysis.adminMessage}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="border border-tech-main/30 bg-tech-main/10 px-2 py-0.5 font-mono text-[0.6875rem] tracking-widest text-tech-main uppercase">
            {t("commitsCount", { count: modeAnalysis.commitCount })}
          </span>
          <span className="border border-tech-main/30 bg-tech-main/10 px-2 py-0.5 font-mono text-[0.6875rem] tracking-widest text-tech-main uppercase">
            {t("filesCount", { count: modeAnalysis.filesAffected })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {modeCards.map(({ mode, title, subtitle, detail }) => {
          const isSelected = selectedMode === mode
          const isRecommended = modeAnalysis.recommendation === mode

          return (
            <button
              key={mode}
              type="button"
              onClick={() => setSelectedMode(mode)}
              className={`
                group relative cursor-pointer p-4 text-left transition-all duration-200 sm:p-5
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
                <span className="mb-3 inline-block border border-tech-main bg-tech-main px-3 py-1 font-mono text-[0.6875rem] font-bold tracking-widest text-white uppercase">
                  {t("recommended")}
                </span>
              )}

              <p
                className={`font-mono text-sm font-bold tracking-widest uppercase ${isSelected ? "text-tech-main" : "text-tech-main/80"}`}>
                {title}
              </p>

              <p className="mt-1.5 font-mono text-xs/relaxed text-tech-main/60">
                {subtitle}
              </p>

              <p className="mt-2 font-mono text-[0.6875rem] leading-relaxed text-tech-main/40">
                {detail}
              </p>

              {isSelected && (
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="inline-block size-1.5 bg-tech-main" />
                  <span className="font-mono text-[0.6875rem] tracking-widest text-tech-main uppercase">
                    {t("selected")}
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
          className="w-full"
          onClick={() => onSelectMode(selectedMode)}>
          {isSelecting
            ? homepageT("initializing")
            : `${t("resolveButton")} [${selectedMode}]`}
        </TechButton>
      </div>
    </div>
  )
}
