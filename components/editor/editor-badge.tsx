"use client"

import { BadgeState } from "@/hooks/use-badge"

interface EditorBadgeProps {
  badge: BadgeState | null
  onDismiss: () => void
}

export function EditorBadge({ badge, onDismiss }: EditorBadgeProps) {
  if (!badge) return null

  return (
    <div
      className={`
        absolute top-4 right-4 z-20 flex items-center gap-2 border
        px-3 py-1.5 font-mono text-xs shadow-sm backdrop-blur-sm
        ${
          badge.type === "error"
            ? "border-red-400 bg-red-900 text-red-200"
            : `
              border-tech-accent bg-tech-main text-tech-accent
              shadow-tech-accent/20
            `
        }
      `}
      role="status"
      aria-live="polite">
      {badge.type === "progress" ? (
        <span className="inline-block size-2 animate-pulse bg-tech-accent" />
      ) : null}
      {badge.type === "error" ? (
        <span className="inline-block size-2 bg-red-400" />
      ) : null}
      {badge.message}
      {badge.type !== "progress" ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-2 text-current/80 hover:text-current"
          aria-label="Dismiss">
          X
        </button>
      ) : null}
    </div>
  )
}
