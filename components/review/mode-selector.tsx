"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ConflictMode, ModeAnalysis } from "@/types/review"
import { TechButton } from "@/components/ui/tech-button"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { SelectableCard } from "@/components/ui/selectable-card"

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
        <p className="text-tech-main/60 font-mono text-xs tracking-widest uppercase">
          {t("conflictResolution")}
        </p>
        <h2 className="text-tech-main mt-1 font-mono text-sm tracking-widest uppercase">
          {t("selectMode")}
        </h2>
      </div>

      <div className="border-tech-main/30 bg-tech-main/5 border px-4 py-3">
        <p className="mono-label mb-2 tracking-widest uppercase">
          {t("analysis")}
        </p>
        <p className="text-tech-main/80 font-mono text-xs/relaxed">
          {modeAnalysis.adminMessage}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="border-tech-main/30 bg-tech-main/10 text-tech-main border px-2 py-0.5 font-mono text-[0.6875rem] tracking-widest uppercase">
            {t("commitsCount", { count: modeAnalysis.commitCount })}
          </span>
          <span className="border-tech-main/30 bg-tech-main/10 text-tech-main border px-2 py-0.5 font-mono text-[0.6875rem] tracking-widest uppercase">
            {t("filesCount", { count: modeAnalysis.filesAffected })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {modeCards.map(({ mode, title, subtitle, detail }) => {
          const isSelected = selectedMode === mode
          const isRecommended = modeAnalysis.recommendation === mode

          return (
            <SelectableCard
              key={mode}
              title={title}
              subtitle={subtitle}
              detail={detail}
              selected={isSelected}
              recommended={isRecommended}
              recommendedLabel={t("recommended")}
              selectedLabel={t("selected")}
              onClick={() => setSelectedMode(mode)}
            />
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
