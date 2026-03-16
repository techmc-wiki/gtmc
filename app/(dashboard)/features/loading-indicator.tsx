"use client";

/**
 * Pending labels for GitHub API operations in features area.
 * Used by IssueActionRow and related components.
 */
export const PENDING_LABELS = {
  CLAIMING_ISSUE: "CLAIMING_ISSUE...",
  DROPPING_ISSUE: "DROPPING_ISSUE...",
  RESOLVING_ISSUE: "RESOLVING_ISSUE...",
  POSTING_COMMENT: "POSTING_COMMENT...",
  SAVING_EXPLANATION: "SAVING_EXPLANATION...",
  SAVING_FEATURE: "SAVING_FEATURE...",
} as const;

export type PendingLabel = (typeof PENDING_LABELS)[keyof typeof PENDING_LABELS];

export interface LoadingIndicatorProps {
  label: PendingLabel;
  ariaHidden?: boolean;
  screenReaderText?: string;
}

/**
 * Lightweight inline pending indicator for GitHub API operations.
 * Renders: pulsing square + uppercase monospace text + optional decorative square.
 * Feature-scoped primitive (not in components/ui/).
 */
export function LoadingIndicator({
  label,
  ariaHidden = false,
  screenReaderText,
}: LoadingIndicatorProps) {
  return (
    <div
      className="flex items-center gap-3 font-mono text-sm"
      role={ariaHidden ? "presentation" : undefined}
      aria-hidden={ariaHidden}
    >
      {/* Pulsing square */}
      <span className="inline-block h-2 w-2 animate-pulse bg-current opacity-60" />

      {/* Uppercase monospace text */}
      <span className="tracking-widest uppercase">{label}</span>

      {/* Screen reader text if provided */}
      {screenReaderText && <span className="sr-only">{screenReaderText}</span>}
    </div>
  );
}
