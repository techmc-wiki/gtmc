"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { LetterBar } from "@/components/glossary/letter-bar"
import { GlossarySearch } from "@/components/glossary/glossary-search"
import { ColumnPicker } from "@/components/glossary/column-picker"
import {
  DensityToggle,
  type GlossaryDensity,
} from "@/components/glossary/density-toggle"
import {
  CategoryFilter,
  type CategoryFilterCategory,
} from "@/components/glossary/category-filter"
import { GlossaryTable } from "@/components/glossary/glossary-table"
import { GlossaryDetailPanel } from "@/components/glossary/glossary-detail-panel"
import {
  SegmentedBar,
  SweepOverlay,
} from "@/components/ui/loading-shell-primitives"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { Link } from "@/i18n/navigation"
import { LOCALE_TO_COLUMN } from "@/lib/glossary/locales"
import type { GlossaryEntry } from "@/lib/glossary/manifest"
import { useGlossaryEntries } from "@/lib/glossary/use-glossary"
import { cn } from "@/lib/cn"
const ALPHA = /[A-Z]/

function letterBucket(slug: string): string {
  const first = slug[0]?.toUpperCase() ?? "#"
  return ALPHA.test(first) ? first : "#"
}

/**
 * Map ColumnPicker CSV-style column names to GlossaryTable lowercase keys.
 * Translation columns include their target locale and field in the table key.
 */
function csvColumnsToTableColumns(csvColumns: string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  const push = (key: string) => {
    if (!seen.has(key)) {
      seen.add(key)
      result.push(key)
    }
  }

  for (const col of csvColumns) {
    if (col === "Full Form (English)") push("term")
    else if (col === "Short Form") push("shortForm")
    else if (col === "Category") push("category")
    else if (col === "Description") push("description")
    else if (col === "Related") push("related")
    else if (col === "Regex") push("regex")
    else {
      for (const [code, mapping] of Object.entries(LOCALE_TO_COLUMN)) {
        if (col === mapping.termColumn) {
          push(`translation:${code}:term`)
          break
        }
        if (col === mapping.descColumn) {
          push(`translation:${code}:description`)
          break
        }
      }
    }
  }

  return result
}

const SKELETON_ROWS = 12

function GlossaryTableSkeleton() {
  return (
    <>
      {/* Desktop skeleton */}
      <div
        aria-busy="true"
        aria-label="Loading glossary entries"
        className="border-tech-line/30 relative hidden h-[min(70vh,48rem)] overflow-hidden border md:block">
        <SweepOverlay />
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {["term", "shortForm", "description", "related"].map((col) => (
                <th
                  key={col}
                  className="text-tech-main/50 border-tech-line/30 bg-tech-bg/95 sticky top-0 z-10 border-b px-3 py-2 text-left font-mono text-xs tracking-widest uppercase backdrop-blur-sm">
                  <SegmentedBar opacity="low" className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <tr key={i} className="border-tech-line/30 border-b">
                <td className="px-3 py-3">
                  <SegmentedBar
                    opacity={i % 3 === 0 ? "high" : "medium"}
                    className="h-4 w-32"
                  />
                </td>
                <td className="px-3 py-3">
                  <SegmentedBar opacity="low" className="h-4 w-16" />
                </td>
                <td className="px-3 py-3">
                  <SegmentedBar opacity="medium" className="h-4 w-48" />
                </td>
                <td className="px-3 py-3">
                  <SegmentedBar opacity="low" className="h-4 w-24" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile skeleton */}
      <div
        aria-busy="true"
        aria-label="Loading glossary entries"
        className="relative space-y-3 md:hidden">
        <SweepOverlay />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="border-tech-line/30 space-y-2 border p-3">
            <SegmentedBar
              opacity={i % 2 === 0 ? "high" : "medium"}
              className="h-4 w-36"
            />
            <SegmentedBar opacity="low" className="h-3 w-20" />
            <SegmentedBar opacity="medium" className="h-3 w-full" />
          </div>
        ))}
      </div>
    </>
  )
}

export interface GlossaryToolbarProps {
  categories: CategoryFilterCategory[]
  locale: string
  totalCount: number
  defaultColumns: Record<string, string[]>
  children?: React.ReactNode
  className?: string
}

export function GlossaryToolbar({
  categories,
  locale,
  totalCount,
  defaultColumns,
  children,
  className,
}: GlossaryToolbarProps) {
  const t = useTranslations("Glossary")
  const { entries, isLoading: entriesLoading } = useGlossaryEntries()

  const localeDefaults = React.useMemo(
    () => defaultColumns[locale] ?? defaultColumns.en ?? [],
    [defaultColumns, locale]
  )

  const [query, setQuery] = React.useState("")
  const [searchScope, setSearchScope] = React.useState<"active" | "all">(
    "active"
  )
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    []
  )
  const [visibleColumns, setVisibleColumns] =
    React.useState<string[]>(localeDefaults)
  const [density, setDensity] = React.useState<GlossaryDensity>("normal")
  const [selectedEntry, setSelectedEntry] =
    React.useState<GlossaryEntry | null>(null)
  const [isReady, setIsReady] = React.useState(false)

  React.useEffect(() => {
    if (entriesLoading) return
    const frame = requestAnimationFrame(() => {
      setIsReady(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [entriesLoading])

  const closeDetailPanel = React.useCallback(() => {
    setSelectedEntry(null)
  }, [])

  const tableColumns = React.useMemo(
    () => csvColumnsToTableColumns(visibleColumns),
    [visibleColumns]
  )

  const availableLetters = React.useMemo(
    () => [...new Set(entries.map((entry) => letterBucket(entry.slug)))],
    [entries]
  )

  const trimmedQuery = query.trim()
  const resultCount = trimmedQuery ? entries.length : entries.length

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <section aria-label={t("letterBarLabel")} className="relative z-30">
        <CornerBrackets size="size-2" color="border-tech-main/30" />
        <div className="border-tech-main/30 bg-surface-overlay/60 relative flex flex-col gap-3 border p-3 backdrop-blur-sm sm:p-4">
          <div className="grid gap-3 sm:flex sm:flex-row sm:items-center">
            <GlossarySearch
              onQueryChange={setQuery}
              onScopeChange={setSearchScope}
              resultCount={resultCount}
              totalCount={totalCount}
              className="min-w-0 sm:flex-1"
            />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex">
              <ColumnPicker
                locale={locale}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
                defaultColumns={localeDefaults}
              />
              <DensityToggle value={density} onChange={setDensity} />
              <Link
                href="/glossary/edit/new"
                locale={locale as "en" | "zh"}
                className="bg-tech-main-dark hover:bg-tech-signal hover:text-tech-signal-ink text-tech-bg hidden h-9 items-center border border-transparent px-3 font-mono text-xs tracking-widest whitespace-nowrap uppercase transition-colors sm:flex">
                {t("proposeEditsCta")}
              </Link>
            </div>
          </div>

          <CategoryFilter
            categories={categories}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            totalCount={totalCount}
          />
        </div>
      </section>

      <LetterBar availableLetters={availableLetters} />

      {entriesLoading ? (
        <GlossaryTableSkeleton />
      ) : (
        <GlossaryTable
          entries={entries}
          visibleColumns={tableColumns}
          density={density}
          query={query}
          searchScope={searchScope}
          selectedCategories={selectedCategories}
          locale={locale}
          onOpenDetail={setSelectedEntry}
          isReady={isReady}
        />
      )}

      <GlossaryDetailPanel
        entry={selectedEntry}
        locale={locale}
        onClose={closeDetailPanel}
      />

      {children}
    </div>
  )
}
