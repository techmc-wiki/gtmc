"use client"

import * as React from "react"
import { diffLines } from "diff"
import { useTranslations } from "next-intl"

type DiffSegment =
  | { id: string; type: "context"; lines: string[] }
  | { id: string; type: "added" | "removed"; lines: string[] }

const CONTEXT_HEAD_LINES = 3
const CONTEXT_TAIL_LINES = 3

export function ReviewDiffPanel({
  baseContent,
  currentContent,
}: {
  baseContent: string
  currentContent: string
}) {
  const t = useTranslations("Review")
  const [expandedSegments, setExpandedSegments] = React.useState<
    Record<string, boolean>
  >({})

  const segments = React.useMemo(
    () => buildDiffSegments(baseContent, currentContent),
    [baseContent, currentContent]
  )

  if (segments.length === 0) {
    return (
      <div className="p-6">
        <p className="mono-label tracking-widest uppercase">
          {t("reviewNoChanges")}
        </p>
      </div>
    )
  }

  return (
    <div className="max-h-[70vh] overflow-auto bg-white/85">
      <div className="space-y-2 p-4 sm:p-6">
        {segments.map((segment) => {
          if (segment.type === "context") {
            const isExpanded = Boolean(expandedSegments[segment.id])
            const hiddenCount =
              segment.lines.length - CONTEXT_HEAD_LINES - CONTEXT_TAIL_LINES
            const canCollapse = hiddenCount > 0
            const visibleLines =
              canCollapse && !isExpanded
                ? [
                    ...segment.lines.slice(0, CONTEXT_HEAD_LINES),
                    ...segment.lines.slice(-CONTEXT_TAIL_LINES),
                  ]
                : segment.lines

            return (
              <div
                key={segment.id}
                className="border border-dashed guide-line bg-tech-main/3">
                <pre className="px-4 py-3 font-mono text-xs/relaxed whitespace-pre-wrap text-tech-main/70">
                  {visibleLines.join("\n") || "\u00a0"}
                </pre>
                {canCollapse && !isExpanded ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSegments((prev) => ({
                        ...prev,
                        [segment.id]: true,
                      }))
                    }
                    className="mx-4 mb-3 block border guide-line bg-tech-main/10 px-3 py-1 font-mono text-[0.625rem] tracking-widest text-tech-main/70 uppercase transition hover:border-tech-main/30 hover:bg-tech-main/15">
                    {t("unchangedLinesHidden", { count: hiddenCount })}
                  </button>
                ) : null}
              </div>
            )
          }

          const palette =
            segment.type === "added"
              ? {
                  bg: "bg-green-500/8",
                  border: "border-green-500/25",
                  marker: "+",
                  text: "text-green-950",
                  badge: "text-green-700",
                  label: t("addedChangesLabel"),
                }
              : {
                  bg: "bg-red-500/8",
                  border: "border-red-500/25",
                  marker: "-",
                  text: "text-red-950",
                  badge: "text-red-700",
                  label: t("removedChangesLabel"),
                }

          return (
            <div
              key={segment.id}
              className={`border ${palette.border} ${palette.bg}`}>
              <div className="border-b border-inherit px-4 py-2">
                <p
                  className={`font-mono text-[0.625rem] tracking-widest uppercase ${palette.badge}`}>
                  {palette.label}
                </p>
              </div>
              <div className="divide-y divide-black/5">
                {segment.lines.map((line, index) => (
                  <div
                    key={`${segment.id}-${index}`}
                    className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 px-4 py-1.5 font-mono text-xs/relaxed">
                    <span className={`${palette.badge} select-none`}>
                      {palette.marker}
                    </span>
                    <pre
                      className={`min-w-0 wrap-break-word whitespace-pre-wrap ${palette.text}`}>
                      {line || "\u00a0"}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildDiffSegments(
  baseContent: string,
  currentContent: string
): DiffSegment[] {
  const parts = diffLines(
    normalizeLineEndings(baseContent),
    normalizeLineEndings(currentContent)
  )

  return parts.reduce<DiffSegment[]>((segments, part, index) => {
    const lines = splitDiffLines(part.value)

    if (lines.length === 0) {
      return segments
    }

    if (part.added) {
      segments.push({ id: `added-${index}`, type: "added", lines })
      return segments
    }

    if (part.removed) {
      segments.push({ id: `removed-${index}`, type: "removed", lines })
      return segments
    }

    segments.push({ id: `context-${index}`, type: "context", lines })
    return segments
  }, [])
}

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}

function splitDiffLines(value: string) {
  if (!value) {
    return []
  }

  const normalized = normalizeLineEndings(value)
  const trimmed = normalized.endsWith("\n")
    ? normalized.slice(0, -1)
    : normalized

  if (trimmed.length === 0) {
    return [""]
  }

  return trimmed.split("\n")
}
