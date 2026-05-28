"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/cn"
import { EmptyState } from "@/components/ui/empty-state"
import { buildGlossarySearchIndex } from "@/lib/glossary/search"
import type { GlossaryEntry } from "@/lib/glossary/manifest"
import { GlossaryTableRow, type GlossaryDensity } from "./glossary-table-row"
import { GlossaryCard } from "./glossary-card"

interface GlossaryTableProps {
  entries: GlossaryEntry[]
  visibleColumns: string[]
  density: GlossaryDensity
  query: string
  searchScope: "active" | "all"
  selectedCategories: string[]
  locale: string
  onOpenDetail?: (entry: GlossaryEntry) => void
  className?: string
}

const ALPHA = /[A-Z]/

function letterBucket(slug: string): string {
  const first = slug[0]?.toUpperCase() ?? "#"
  return ALPHA.test(first) ? first : "#"
}

const COLUMN_LABEL_KEYS: Record<string, string> = {
  term: "columnTerm",
  shortForm: "columnShortForm",
  regex: "columnRegex",
  description: "columnDescription",
  translation: "columnLanguageGroup",
  related: "columnRelated",
}

const headerCellBase =
  "text-tech-main/50 border-tech-line/30 sticky top-0 z-10 border-b bg-tech-bg/95 px-3 py-2 text-left font-mono text-xs tracking-widest uppercase backdrop-blur-sm"

function normalizeLocaleForIndex(locale: string): "en" | "zh" {
  return locale === "zh" ? "zh" : "en"
}

export function GlossaryTable({
  entries,
  visibleColumns,
  density,
  query,
  searchScope,
  selectedCategories,
  locale,
  onOpenDetail,
  className,
}: GlossaryTableProps) {
  const t = useTranslations("Glossary")

  const indexLocale = normalizeLocaleForIndex(locale)

  const categoryFiltered = React.useMemo(() => {
    if (selectedCategories.length === 0) return entries
    const allow = new Set(selectedCategories)
    return entries.filter((e) => allow.has(e.category))
  }, [entries, selectedCategories])

  const trimmedQuery = query.trim()

  const filteredEntries = React.useMemo(() => {
    if (!trimmedQuery) return categoryFiltered

    const index = buildGlossarySearchIndex(
      categoryFiltered,
      searchScope,
      indexLocale
    )
    const hits = index.search(trimmedQuery)
    const hitOrder = new Map<string, number>()
    hits.forEach((hit, i) => {
      hitOrder.set(hit.id as string, i)
    })

    return categoryFiltered
      .filter((e) => hitOrder.has(e.slug))
      .toSorted(
        (a, b) => (hitOrder.get(a.slug) ?? 0) - (hitOrder.get(b.slug) ?? 0)
      )
  }, [categoryFiltered, trimmedQuery, searchScope, indexLocale])

  const grouped = React.useMemo(() => {
    if (trimmedQuery) {
      return [{ letter: "_results", items: filteredEntries }]
    }
    const byLetter = new Map<string, GlossaryEntry[]>()
    for (const entry of filteredEntries) {
      const letter = letterBucket(entry.slug)
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
  }, [filteredEntries, trimmedQuery])

  if (filteredEntries.length === 0) {
    return (
      <div className={className}>
        <EmptyState message={t("noResults")} />
      </div>
    )
  }

  const colCount = visibleColumns.length || 1

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {grouped.map((group) => {
        const sectionId =
          group.letter === "_results"
            ? "letter-results"
            : `letter-${group.letter}`

        return (
          <section
            key={sectionId}
            id={sectionId}
            aria-label={
              group.letter === "_results"
                ? "search results"
                : `letter ${group.letter}`
            }
            className="scroll-mt-28 md:scroll-mt-32">
            {group.letter !== "_results" && (
              <div className="border-tech-line/30 mb-2 flex items-baseline gap-3 border-b pb-1">
                <h2 className="text-tech-main-dark font-mono text-2xl font-bold tracking-widest uppercase">
                  {group.letter}
                </h2>
                <span className="text-tech-main/40 font-mono text-xs tracking-widest uppercase">
                  {group.items.length}
                </span>
              </div>
            )}

            <table
              className="hidden w-full table-fixed border-collapse md:table"
              data-density={density}>
              <thead>
                <tr>
                  {visibleColumns.map((col) => {
                    const key = COLUMN_LABEL_KEYS[col]
                    return (
                      <th
                        key={col}
                        scope="col"
                        className={cn(
                          headerCellBase,
                          col === "term" && "min-w-[10rem]",
                          col === "description" && "max-w-[36rem]",
                          col === "translation" && "max-w-[24rem]"
                        )}>
                        {key ? t(key as Parameters<typeof t>[0]) : col}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {group.items.map((entry) => (
                  <GlossaryTableRow
                    key={entry.slug}
                    entry={entry}
                    visibleColumns={visibleColumns}
                    density={density}
                    locale={locale}
                    onOpenDetail={onOpenDetail}
                  />
                ))}
              </tbody>
            </table>

            <div
              className="flex flex-col gap-2 md:hidden"
              data-density={density}
              aria-hidden={false}>
              {group.items.map((entry) => (
                <GlossaryCard
                  key={entry.slug}
                  entry={entry}
                  visibleColumns={visibleColumns}
                  locale={locale}
                  density={density}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>

            <span className="sr-only">
              {group.items.length} {colCount > 0 ? "rows" : ""}
            </span>
          </section>
        )
      })}
    </div>
  )
}
