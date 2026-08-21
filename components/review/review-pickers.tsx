"use client"

import * as React from "react"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import { SelectableCard } from "@/components/ui/selectable-card"
import type {
  ConflictMode,
  ModeAnalysis,
  ReviewMergeMethod,
  ReviewMergeStrategyAnalysis,
} from "@/lib/review/review-types"

const EMPTY_COAUTHOR_LINES: string[] = []

interface MergeMethodPickerProps {
  analysis: ReviewMergeStrategyAnalysis
  selectedMethod: ReviewMergeMethod
  onSelectMethod: (method: ReviewMergeMethod) => void
  commitTitle: string
  commitBody: string
  onCommitTitleChange: (value: string) => void
  onCommitBodyChange: (value: string) => void
  coauthorLines?: string[]
  disabled?: boolean
  compact?: boolean
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Merge-strategy picker with squash commit title/body fields. */
export function MergeMethodPicker({
  analysis,
  selectedMethod,
  onSelectMethod,
  commitTitle,
  commitBody,
  onCommitTitleChange,
  onCommitBodyChange,
  coauthorLines = EMPTY_COAUTHOR_LINES,
  disabled = false,
  compact = false,
}: MergeMethodPickerProps) {
  const t = useTranslations("Review")

  const handleCommitTitleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onCommitTitleChange(event.target.value),
    [onCommitTitleChange]
  )

  const handleCommitBodyChange = React.useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      onCommitBodyChange(event.target.value),
    [onCommitBodyChange]
  )

  const methodClickHandlers = React.useMemo(
    () =>
      new Map(
        analysis.availableMethods.map((method) => [
          method,
          () => onSelectMethod(method),
        ])
      ),
    [analysis.availableMethods, onSelectMethod]
  )

  const methods = React.useMemo(
    () =>
      analysis.availableMethods.map((method) => ({
        method,
        title: t(`mergeMethod${capitalize(method)}`),
        description: t(`mergeMethod${capitalize(method)}Desc`),
        detail: t(`mergeMethod${capitalize(method)}Detail`),
      })),
    [analysis.availableMethods, t]
  )

  return (
    <div
      className={`border-tech-main/30 bg-surface-overlay/80 relative border ${compact ? "p-3" : "p-4"}`}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-tech-main/60 font-mono text-[0.6875rem] tracking-widest uppercase">
            {t("mergeStrategyLabel")}
          </p>
          <span className="border-tech-main/30 bg-tech-main/5 text-tech-main border px-2 py-0.5 font-mono text-[0.625rem] tracking-widest uppercase">
            {t("autoDecisionPrefix")}{" "}
            {t(`mergeMethod${capitalize(analysis.recommendation)}`)}
          </span>
        </div>
        <p className="text-tech-main/70 font-mono text-xs/relaxed">
          {analysis.rationale}
        </p>
      </div>

      <div
        className={`mt-4 grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-3"}`}>
        {methods.map(({ method, title, description, detail }) => {
          const isSelected = selectedMethod === method
          const isRecommended = analysis.recommendation === method

          return (
            <SelectableCard
              key={method}
              title={title}
              subtitle={description}
              detail={detail}
              selected={isSelected}
              recommended={isRecommended}
              recommendedLabel={t("recommended")}
              selectedLabel={t("selected")}
              disabled={disabled}
              onClick={methodClickHandlers.get(method)}
              className="p-3"
            />
          )
        })}
      </div>

      {selectedMethod === "squash" ? (
        <div className="border-tech-main/15 mt-4 space-y-3 border-t pt-4">
          <div className="space-y-1">
            <label
              htmlFor="merge-commit-title"
              className="text-tech-main/50 font-mono text-[0.6875rem] tracking-widest uppercase">
              {t("commitTitleLabel")}
            </label>
            <input
              id="merge-commit-title"
              type="text"
              value={commitTitle}
              disabled={disabled}
              onChange={handleCommitTitleChange}
              className="border-tech-main/30 text-tech-main placeholder:text-tech-main/30 focus-visible:border-tech-main bg-surface-input w-full border px-3 py-2 font-mono text-xs focus:outline-none"
              placeholder={t("commitTitlePlaceholder")}
              aria-label={t("commitTitleLabel")}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="merge-commit-body"
              className="text-tech-main/50 font-mono text-[0.6875rem] tracking-widest uppercase">
              {t("commitBodyLabel")}
            </label>
            <textarea
              id="merge-commit-body"
              value={commitBody}
              disabled={disabled}
              onChange={handleCommitBodyChange}
              rows={compact ? 3 : 5}
              className="border-tech-main/30 text-tech-main placeholder:text-tech-main/30 focus-visible:border-tech-main bg-surface-input w-full resize-y border px-3 py-2 font-mono text-xs focus:outline-none"
              placeholder={t("commitBodyPlaceholder")}
              aria-label={t("commitBodyLabel")}
            />
          </div>

          {coauthorLines.length > 0 ? (
            <div className="space-y-1">
              <p className="text-tech-main/50 font-mono text-[0.6875rem] tracking-widest uppercase">
                {t("coauthorsReadonly")}
              </p>
              <pre className="guide-line bg-tech-main/5 text-tech-main/60 overflow-x-auto border px-3 py-2 font-mono text-[0.6875rem]">
                {coauthorLines.join("\n")}
              </pre>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="border-tech-main/15 text-tech-main/55 mt-4 border-t pt-4 font-mono text-[0.6875rem] leading-relaxed">
          {selectedMethod === "direct"
            ? t("mergeMethodDirectNote")
            : t("mergeMethodRebaseNote")}
        </div>
      )}
    </div>
  )
}

interface ModeSelectorProps {
  modeAnalysis: ModeAnalysis
  onSelectMode: (mode: ConflictMode) => void
  hasConflicts: boolean
  isSelecting?: boolean
}

/** Conflict-resolution mode picker with analysis readout and resolve CTA. */
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
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-2 bg-green-500"
              aria-hidden="true"
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
        <Button
          variant="primary"
          size="md"
          disabled={isSelecting}
          className="w-full"
          onClick={() => onSelectMode(selectedMode)}>
          {isSelecting
            ? homepageT("initializing")
            : `${t("resolveButton")} [${selectedMode}]`}
        </Button>
      </div>
    </div>
  )
}
