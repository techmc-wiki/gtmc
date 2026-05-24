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
  CategoryChips,
  type CategoryChipsCategory,
} from "@/components/glossary/category-chips"
import { GlossaryTable } from "@/components/glossary/glossary-table"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { LOCALE_TO_COLUMN, isGlossaryLocale } from "@/lib/glossary/locales"
import type { GlossaryEntry } from "@/lib/glossary/manifest"
import { cn } from "@/lib/cn"

const ALPHA = /[A-Z]/

function letterBucket(slug: string): string {
  const first = slug[0]?.toUpperCase() ?? "#"
  return ALPHA.test(first) ? first : "#"
}

/**
 * Map ColumnPicker CSV-style column names to GlossaryTable lowercase keys.
 * Translation columns (locale-specific) collapse into the generic "translation" key.
 */
function csvColumnsToTableColumns(
  csvColumns: string[],
  locale: string
): string[] {
  const localeTermColumn = isGlossaryLocale(locale)
    ? LOCALE_TO_COLUMN[locale].termColumn
    : null

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
    else if (col === "Description") push("description")
    else if (col === "Related") push("related")
    else if (col === "Regex") push("regex")
    else if (localeTermColumn && col === localeTermColumn) push("translation")
    // "Category" and other-locale columns intentionally skipped — table has no
    // dedicated cells for them.
  }

  return result
}

export interface GlossaryToolbarProps {
  entries: GlossaryEntry[]
  locale: string
  totalCount: number
  defaultColumns: Record<string, string[]>
  children?: React.ReactNode
  className?: string
}

export function GlossaryToolbar({
  entries,
  locale,
  totalCount,
  defaultColumns,
  children,
  className,
}: GlossaryToolbarProps) {
  const t = useTranslations("Glossary")

  const localeDefaults = React.useMemo(() => {
    return defaultColumns[locale] ?? defaultColumns.en ?? []
  }, [defaultColumns, locale])

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

  const categories = React.useMemo<CategoryChipsCategory[]>(() => {
    const counts = new Map<string, number>()
    for (const entry of entries) {
      const name = entry.category?.trim()
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [entries])

  const availableLetters = React.useMemo(() => {
    const set = new Set<string>()
    for (const entry of entries) {
      set.add(letterBucket(entry.slug))
    }
    return [...set]
  }, [entries])

  const tableColumns = React.useMemo(
    () => csvColumnsToTableColumns(visibleColumns, locale),
    [visibleColumns, locale]
  )

  const trimmedQuery = query.trim()
  const resultCount = trimmedQuery ? entries.length : entries.length

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <section aria-label={t("letterBarLabel")} className="relative z-30">
        <CornerBrackets size="size-2" color="border-tech-main/30" />
        <div className="border-tech-main/30 relative flex flex-col gap-3 border bg-white/60 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <GlossarySearch
              onQueryChange={setQuery}
              onScopeChange={setSearchScope}
              resultCount={resultCount}
              totalCount={totalCount}
              className="flex-1"
            />
            <div className="flex items-stretch gap-2 [&>[role=radiogroup]>button]:min-h-9">
              <ColumnPicker
                locale={locale}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
                defaultColumns={localeDefaults}
              />
              <DensityToggle value={density} onChange={setDensity} />
            </div>
          </div>

          <CategoryChips
            categories={categories}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            totalCount={totalCount}
          />
        </div>
      </section>

      <LetterBar availableLetters={availableLetters} />

      <GlossaryTable
        entries={entries}
        visibleColumns={tableColumns}
        density={density}
        query={query}
        searchScope={searchScope}
        selectedCategories={selectedCategories}
        locale={locale}
      />

      {children}
    </div>
  )
}
