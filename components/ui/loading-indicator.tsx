"use client"

import { useTranslations } from "next-intl"

export const PENDING_LABELS = {
  CLAIMING_ISSUE: "claimingIssue",
  DROPPING_ISSUE: "loading",
  RESOLVING_ISSUE: "loading",
  POSTING_COMMENT: "loading",
  SAVING_EXPLANATION: "saving",
  SAVING_FEATURE: "saving",
  SAVING_DRAFT: "saving",
  SUBMITTING_REVIEW: "submitting",
  UPDATING_PR: "loading",
} as const

export type PendingLabel = (typeof PENDING_LABELS)[keyof typeof PENDING_LABELS]

export interface LoadingIndicatorProps {
  label: PendingLabel
  ariaHidden?: boolean
  screenReaderText?: string
}

export function LoadingIndicator({
  label,
  ariaHidden = false,
  screenReaderText,
}: LoadingIndicatorProps) {
  const t = useTranslations("Loading")

  return (
    <div
      className="flex items-center gap-3 font-mono text-sm"
      role={ariaHidden ? "presentation" : undefined}
      aria-hidden={ariaHidden}>
      <span className="inline-block size-2 animate-pulse bg-current opacity-60" />
      <span className="tracking-widest uppercase">{t(label)}</span>
      {screenReaderText && <span className="sr-only">{screenReaderText}</span>}
    </div>
  )
}
