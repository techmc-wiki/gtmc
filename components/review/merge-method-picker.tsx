"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { CornerBrackets } from "@/components/ui/corner-brackets"
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
      className={`relative border border-tech-main/30 bg-white/80 ${compact ? "p-3" : "p-4"}`}>
      <CornerBrackets color="border-tech-main/20" />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/60 uppercase">
            {t("mergeStrategyLabel")}
          </p>
          <span className="border border-tech-main/30 bg-tech-main/5 px-2 py-0.5 font-mono text-[0.625rem] tracking-widest text-tech-main uppercase">
            {t("autoDecisionPrefix")}{" "}
            {t(`mergeMethod${capitalize(analysis.recommendation)}`)}
          </span>
        </div>
        <p className="font-mono text-xs/relaxed text-tech-main/70">
          {analysis.rationale}
        </p>
      </div>

      <div
        className={`mt-4 grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-3"}`}>
        {methods.map(({ method, title, description, detail }) => {
          const isSelected = selectedMethod === method
          const isRecommended = analysis.recommendation === method

          return (
            <button
              key={method}
              type="button"
              disabled={disabled}
              onClick={() => onSelectMethod(method)}
              className={`relative border p-3 text-left transition ${
                isSelected
                  ? "border-tech-main bg-tech-main/10"
                  : "guide-line bg-white/70 hover:border-tech-main/40 hover:bg-white"
              } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-bold tracking-widest text-tech-main uppercase">
                  {title}
                </span>
                {isRecommended ? (
                  <span className="border border-tech-main/30 bg-tech-main px-2 py-0.5 font-mono text-[0.5625rem] tracking-widest text-white uppercase">
                    {t("recommended")}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 font-mono text-[0.6875rem] leading-relaxed text-tech-main/65">
                {description}
              </p>
              <p className="mt-2 font-mono text-[0.625rem] leading-relaxed text-tech-main/45">
                {detail}
              </p>
            </button>
          )
        })}
      </div>

      {selectedMethod === "squash" ? (
        <div className="mt-4 space-y-3 border-t border-tech-main/15 pt-4">
          <div className="space-y-1">
            <label
              htmlFor="merge-commit-title"
              className="font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
              {t("commitTitleLabel")}
            </label>
            <input
              id="merge-commit-title"
              type="text"
              value={commitTitle}
              disabled={disabled}
              onChange={(event) => onCommitTitleChange(event.target.value)}
              className="w-full border border-tech-main/30 bg-white px-3 py-2 font-mono text-xs text-tech-main placeholder:text-tech-main/30 focus:border-tech-main focus:outline-none"
              placeholder={t("commitTitlePlaceholder")}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="merge-commit-body"
              className="font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
              {t("commitBodyLabel")}
            </label>
            <textarea
              id="merge-commit-body"
              value={commitBody}
              disabled={disabled}
              onChange={(event) => onCommitBodyChange(event.target.value)}
              rows={compact ? 3 : 5}
              className="w-full resize-y border border-tech-main/30 bg-white px-3 py-2 font-mono text-xs text-tech-main placeholder:text-tech-main/30 focus:border-tech-main focus:outline-none"
              placeholder={t("commitBodyPlaceholder")}
            />
          </div>

          {coauthorLines.length > 0 ? (
            <div className="space-y-1">
              <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/50 uppercase">
                {t("coauthorsReadonly")}
              </p>
              <pre className="overflow-x-auto border guide-line bg-tech-main/5 px-3 py-2 font-mono text-[0.6875rem] text-tech-main/60">
                {coauthorLines.join("\n")}
              </pre>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 border-t border-tech-main/15 pt-4 font-mono text-[0.6875rem] leading-relaxed text-tech-main/55">
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
