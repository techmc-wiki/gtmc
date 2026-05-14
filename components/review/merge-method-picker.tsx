"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { CornerBrackets } from "@/components/ui/corner-brackets"
import { SelectableCard } from "@/components/ui/selectable-card"
import type {
  ReviewMergeMethod,
  ReviewMergeStrategyAnalysis,
} from "@/types/review"

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

export function MergeMethodPicker({
  analysis,
  selectedMethod,
  onSelectMethod,
  commitTitle,
  commitBody,
  onCommitTitleChange,
  onCommitBodyChange,
  coauthorLines = [],
  disabled = false,
  compact = false,
}: MergeMethodPickerProps) {
  const t = useTranslations("Review")

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
      className={`border-tech-main/30 relative border bg-white/80 ${compact ? "p-3" : "p-4"}`}>
      <CornerBrackets color="border-tech-main/20" />

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
              onClick={() => onSelectMethod(method)}
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
              onChange={(event) => onCommitTitleChange(event.target.value)}
              className="border-tech-main/30 text-tech-main placeholder:text-tech-main/30 focus:border-tech-main w-full border bg-white px-3 py-2 font-mono text-xs focus:outline-none"
              placeholder={t("commitTitlePlaceholder")}
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
              onChange={(event) => onCommitBodyChange(event.target.value)}
              rows={compact ? 3 : 5}
              className="border-tech-main/30 text-tech-main placeholder:text-tech-main/30 focus:border-tech-main w-full resize-y border bg-white px-3 py-2 font-mono text-xs focus:outline-none"
              placeholder={t("commitBodyPlaceholder")}
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

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
