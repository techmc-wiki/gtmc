"use client"

export const PENDING_LABELS = {
  CLAIMING_ISSUE: "CLAIMING_ISSUE...",
  DROPPING_ISSUE: "DROPPING_ISSUE...",
  RESOLVING_ISSUE: "RESOLVING_ISSUE...",
  POSTING_COMMENT: "POSTING_COMMENT...",
  SAVING_EXPLANATION: "SAVING_EXPLANATION...",
  SAVING_FEATURE: "SAVING_FEATURE...",
  SAVING_DRAFT: "SAVING...",
  SUBMITTING_REVIEW: "SUBMITTING...",
  UPDATING_PR: "UPDATING_PR...",
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
  return (
    <div
      className="flex items-center gap-3 font-mono text-sm"
      role={ariaHidden ? "presentation" : undefined}
      aria-hidden={ariaHidden}>
      <span className="inline-block size-2 animate-pulse bg-current opacity-60" />
      <span className="tracking-widest uppercase">{label}</span>
      {screenReaderText && <span className="sr-only">{screenReaderText}</span>}
    </div>
  )
}
