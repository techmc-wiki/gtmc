"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { LetterBar } from "@/components/glossary/letter-bar"
import { GlossarySearch } from "@/components/glossary/glossary-search"
import { FieldPicker } from "@/components/glossary/column-picker"
import {
  CategoryFacet,
  type GlossaryCategoryOption,
} from "@/components/glossary/category-filter"
import { GlossaryTable } from "@/components/glossary/glossary-table"
import { GlossaryDetailPanel } from "@/components/glossary/term-detail"
import { SegmentedBar } from "@/components/ui/loading-shell-primitives"
import { Badge } from "@/components/ui/shadcn/badge"
import { Button } from "@/components/ui/shadcn/button"
import { Separator } from "@/components/ui/shadcn/separator"
import { Link } from "@/i18n/navigation"
import type { GlossaryIndexEntry } from "@/lib/glossary/localized-index"
import { filterGlossaryEntries } from "@/lib/glossary/filter-entries"
import {
  OPEN_GLOSSARY_TERM_EVENT,
  type OpenGlossaryTermDetail,
} from "@/lib/glossary/browser-events"
import {
  readPersistedGlossaryColumns,
  writePersistedGlossaryColumns,
} from "@/lib/glossary/persisted-prefs"
import {
  GLOSSARY_COLUMNS,
  isGlossaryColumn,
  type GlossaryColumn,
} from "@/lib/glossary/view-options"
import { useLocalizedGlossary } from "@/lib/glossary/use-localized-glossary"
import { cn } from "@/lib/cn"
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs"

const SKELETON_ROWS = 12

function GlossaryTableSkeleton() {
  return (
    <>
      <div
        aria-busy="true"
        aria-label="Loading glossary entries"
        className="border-tech-line/30 relative hidden h-[min(70vh,48rem)] overflow-hidden border md:block">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {["term", "shortForm", "description"].map((col) => (
                <th
                  key={col}
                  className="text-tech-main/50 border-tech-line/30 bg-tech-bg/95 sticky top-0 z-10 border-b px-3 py-2 text-left text-xs font-medium backdrop-blur-sm">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        aria-busy="true"
        aria-label="Loading glossary entries"
        className="relative space-y-3 md:hidden">
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

export interface GlossaryBrowserProps {
  categories: GlossaryCategoryOption[]
  locale: string
  totalCount: number
  children?: React.ReactNode
  className?: string
}

function sanitizeColumns(value: unknown): GlossaryColumn[] {
  if (!Array.isArray(value)) return [...GLOSSARY_COLUMNS]
  const columns = value.filter(isGlossaryColumn)
  return columns.length > 0 ? columns : [...GLOSSARY_COLUMNS]
}

export function GlossaryBrowser({
  categories,
  locale,
  totalCount,
  children,
  className,
}: GlossaryBrowserProps) {
  const t = useTranslations("Glossary")
  const { entries, isLoading: entriesLoading } = useLocalizedGlossary(locale)

  const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""))
  const [selectedCategories, setSelectedCategories] = useQueryState(
    "categories",
    parseAsArrayOf(parseAsString).withDefault([])
  )
  const [visibleColumns, setVisibleColumns] = React.useState<GlossaryColumn[]>(
    () => sanitizeColumns(readPersistedGlossaryColumns(locale))
  )

  const handleVisibleColumnsChange = React.useCallback(
    (next: GlossaryColumn[]) => {
      const sanitized = sanitizeColumns(next)
      setVisibleColumns(sanitized)
      writePersistedGlossaryColumns(locale, sanitized)
    },
    [locale]
  )
  const [selectedEntry, setSelectedEntry] =
    React.useState<GlossaryIndexEntry | null>(null)
  const isReady = !entriesLoading

  const filteredEntries = React.useMemo(
    () =>
      filterGlossaryEntries(entries, {
        query,
        selectedCategories,
      }),
    [entries, query, selectedCategories]
  )
  const resultCount = filteredEntries.length
  const hasActiveQuery = query.trim().length > 0
  const hasActiveFilters = hasActiveQuery || selectedCategories.length > 0

  const handleClearFilters = React.useCallback(() => {
    void setQuery("")
    void setSelectedCategories([])
  }, [setQuery, setSelectedCategories])

  const handleRemoveQuery = React.useCallback(() => {
    void setQuery("")
  }, [setQuery])

  const handleRemoveCategory = React.useCallback(
    (name: string) => {
      void setSelectedCategories(
        selectedCategories.filter((entry) => entry !== name)
      )
    },
    [selectedCategories, setSelectedCategories]
  )

  const entriesBySlug = React.useMemo(
    () => new Map(entries.map((entry) => [entry.slug, entry] as const)),
    [entries]
  )

  const openDetailBySlug = React.useCallback(
    (slug: string) => {
      const entry = entriesBySlug.get(slug)
      if (entry) setSelectedEntry(entry)
    },
    [entriesBySlug]
  )

  const closeDetailPanel = React.useCallback(() => {
    setSelectedEntry(null)

    if (window.location.hash.startsWith("#term=")) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
      )
    }
  }, [])

  React.useEffect(() => {
    const openDetailFromHash = () => {
      const encodedSlug = window.location.hash.slice("#term=".length)
      if (!window.location.hash.startsWith("#term=") || !encodedSlug) return

      try {
        openDetailBySlug(decodeURIComponent(encodedSlug))
      } catch {
        // Ignore malformed external hashes and leave the glossary index open.
      }
    }

    const openDetailFromEvent = (event: Event) => {
      const { slug } = (event as CustomEvent<OpenGlossaryTermDetail>).detail
      openDetailBySlug(slug)
    }

    openDetailFromHash()
    window.addEventListener("hashchange", openDetailFromHash)
    window.addEventListener(OPEN_GLOSSARY_TERM_EVENT, openDetailFromEvent)
    return () => {
      window.removeEventListener("hashchange", openDetailFromHash)
      window.removeEventListener(OPEN_GLOSSARY_TERM_EVENT, openDetailFromEvent)
    }
  }, [openDetailBySlug])

  const availableLetters = React.useMemo(
    () =>
      hasActiveFilters
        ? []
        : [...new Set(entries.map((entry) => entry.indexLetter))],
    [entries, hasActiveFilters]
  )

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <section aria-label={t("controlsLabel")} className="relative z-30">
        <div className="border-tech-main/30 bg-surface-overlay/60 relative flex flex-col gap-4 border p-3 backdrop-blur-sm sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <GlossarySearch
              query={query}
              onQueryChange={setQuery}
              className="min-w-56 flex-1"
            />
            <CategoryFacet
              categories={categories}
              selected={selectedCategories}
              onChange={setSelectedCategories}
            />
            <Separator
              orientation="vertical"
              className="bg-tech-line/40 mx-1 hidden h-6 sm:block"
            />
            <FieldPicker
              visibleColumns={visibleColumns}
              onChange={handleVisibleColumnsChange}
            />
            <Button asChild size="sm" className="ml-auto min-h-11">
              <Link href="/glossary/edit/new" locale={locale as "en" | "zh"}>
                <Plus aria-hidden="true" />
                {t("proposeEditsCta")}
              </Link>
            </Button>
          </div>

          <output
            aria-live="polite"
            aria-atomic="true"
            className="text-tech-main/60 block text-xs tabular-nums">
            {t("searchResultSummary", { resultCount, totalCount })}
          </output>

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveQuery ? (
                <Badge variant="neutral" className="gap-1.5 py-1 pr-1 pl-2.5">
                  <span className="max-w-48 truncate">{query.trim()}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleRemoveQuery}
                    aria-label={t("removeQueryFilter")}
                    className="min-h-0">
                    <X aria-hidden="true" />
                  </Button>
                </Badge>
              ) : null}
              {selectedCategories.map((name) => (
                <Badge
                  key={name}
                  variant="neutral"
                  className="gap-1.5 py-1 pr-1 pl-2.5">
                  <span className="max-w-48 truncate">{name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemoveCategory(name)}
                    aria-label={t("removeCategoryFilter", { name })}
                    className="min-h-0">
                    <X aria-hidden="true" />
                  </Button>
                </Badge>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="min-h-11">
                {t("clearFilters")}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {hasActiveFilters ? null : (
        <LetterBar availableLetters={availableLetters} />
      )}

      {entriesLoading ? (
        <GlossaryTableSkeleton />
      ) : (
        <GlossaryTable
          entries={filteredEntries}
          visibleColumns={visibleColumns}
          hasActiveFilters={hasActiveFilters}
          locale={locale}
          onOpenDetail={setSelectedEntry}
          isReady={isReady}
        />
      )}

      <GlossaryDetailPanel
        entry={selectedEntry}
        locale={locale}
        onClose={closeDetailPanel}
        onOpenRelated={openDetailBySlug}
      />

      {children}
    </div>
  )
}
