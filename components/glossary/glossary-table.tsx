"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/cn"
import { EmptyState } from "@/components/ui/empty-state"
import type { GlossaryIndexEntry } from "@/lib/glossary/localized-index"
import type { GlossaryColumn } from "@/lib/glossary/view-options"
import { GlossaryTableRow, GlossaryCard } from "./glossary-entry"

interface GlossaryTableProps {
  entries: GlossaryIndexEntry[]
  visibleColumns: GlossaryColumn[]
  hasActiveFilters: boolean
  locale: string
  onOpenDetail?: (entry: GlossaryIndexEntry) => void
  className?: string
  isReady?: boolean
}

const COLUMN_LABEL_KEYS: Record<GlossaryColumn, string> = {
  term: "columnTerm",
  shortForm: "columnShortForm",
  description: "columnDescription",
}

const headerCellBase =
  "text-xs font-medium text-tech-main/60 border-tech-line/30 sticky top-0 z-10 border-b bg-tech-bg/95 px-3 py-2 text-left backdrop-blur-sm"

export function GlossaryTable({
  entries,
  visibleColumns,
  hasActiveFilters,
  locale,
  onOpenDetail,
  className,
  isReady,
}: GlossaryTableProps) {
  const t = useTranslations("Glossary")
  const tableScrollRef = React.useRef<HTMLDivElement>(null)
  const mobileScrollRef = React.useRef<HTMLDivElement>(null)

  const grouped = React.useMemo(() => {
    if (hasActiveFilters) {
      return [{ letter: "_results", items: entries }]
    }
    const byLetter = new Map<string, GlossaryIndexEntry[]>()
    for (const entry of entries) {
      const letter = entry.indexLetter
      let bucket = byLetter.get(letter)
      if (!bucket) {
        bucket = []
        byLetter.set(letter, bucket)
      }
      bucket.push(entry)
    }
    return [...byLetter.entries()]
      .toSorted(([a], [b]) => {
        if (a === "#") return 1
        if (b === "#") return -1
        return a.localeCompare(b)
      })
      .map(([letter, items]) => ({ letter, items }))
  }, [entries, hasActiveFilters])

  if (entries.length === 0) {
    return (
      <div className={className}>
        <EmptyState message={t("noResults")} />
      </div>
    )
  }

  const colCount = visibleColumns.length || 1

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <div
        ref={tableScrollRef}
        className="border-tech-line/30 custom-bottom-scrollbar relative hidden h-[min(70vh,48rem)] overflow-auto border md:block">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {visibleColumns.map((col: GlossaryColumn) => (
                <th
                  key={col}
                  scope="col"
                  className={cn(
                    headerCellBase,
                    col === "term" && "min-w-[10rem]",
                    col === "description" && "max-w-[36rem]"
                  )}>
                  {t(COLUMN_LABEL_KEYS[col] as Parameters<typeof t>[0])}
                </th>
              ))}
            </tr>
          </thead>
          {grouped.map((group) => {
            const isResultGroup = group.letter === "_results"
            const letterId = isResultGroup
              ? "letter-results"
              : `letter-${group.letter}`

            return (
              <tbody
                key={group.letter}
                className="[contain-intrinsic-size:auto_200px] [content-visibility:auto]">
                {!isResultGroup && (
                  <tr
                    id={letterId}
                    aria-label={`letter ${group.letter}`}
                    className="border-tech-line/30 bg-tech-bg/95 scroll-mt-10 border-b">
                    <td
                      aria-label={`letter ${group.letter}`}
                      colSpan={colCount}
                      className="px-3 py-2">
                      <div className="flex items-baseline gap-3">
                        <h2 className="display-title text-tech-main-dark text-2xl">
                          {group.letter}
                        </h2>
                        <span className="text-tech-main/40 text-xs tabular-nums">
                          {group.items.length}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
                {group.items.map((entry) => (
                  <GlossaryTableRow
                    key={entry.slug}
                    entry={entry}
                    visibleColumns={visibleColumns}
                    locale={locale}
                    onOpenDetail={onOpenDetail}
                    isReady={isReady}
                  />
                ))}
              </tbody>
            )
          })}
        </table>
      </div>

      <div
        ref={mobileScrollRef}
        className="custom-bottom-scrollbar relative h-[min(75vh,44rem)] space-y-6 overflow-auto md:hidden">
        {grouped.map((group) => {
          const isResultGroup = group.letter === "_results"
          const letterId = isResultGroup
            ? "letter-results-mobile"
            : `letter-${group.letter}-mobile`

          return (
            <section
              key={group.letter}
              id={letterId}
              aria-label={
                isResultGroup ? "search results" : `letter ${group.letter}`
              }
              className="scroll-mt-4 [contain-intrinsic-size:auto_280px] [content-visibility:auto]">
              {!isResultGroup && (
                <div className="border-tech-line/30 mb-2 flex items-baseline gap-3 border-b pb-1">
                  <h2 className="display-title text-tech-main-dark text-2xl">
                    {group.letter}
                  </h2>
                  <span className="text-tech-main/40 text-xs tabular-nums">
                    {group.items.length}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {group.items.map((entry) => (
                  <GlossaryCard
                    key={entry.slug}
                    entry={entry}
                    visibleColumns={visibleColumns}
                    locale={locale}
                    onOpenDetail={onOpenDetail}
                    isReady={isReady}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
