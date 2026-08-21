"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { LetterBar } from "@/components/glossary/letter-bar"
import { GlossarySearch } from "@/components/glossary/glossary-search"
import { ColumnPicker } from "@/components/glossary/column-picker"
import { DensityToggle } from "@/components/glossary/density-toggle"
import {
  CategoryFilter,
  type CategoryFilterCategory,
} from "@/components/glossary/category-filter"
import { GlossaryTable } from "@/components/glossary/glossary-table"
import { GlossaryDetailPanel } from "@/components/glossary/term-detail"
import { SegmentedBar } from "@/components/ui/loading-shell-primitives"
import { Link } from "@/i18n/navigation"
import type { GlossaryIndexEntry } from "@/lib/glossary/localized-index"
import {
  OPEN_GLOSSARY_TERM_EVENT,
  type OpenGlossaryTermDetail,
} from "@/lib/glossary/browser-events"
import {
  readPersistedGlossaryColumns,
  readPersistedGlossaryDensity,
  writePersistedGlossaryColumns,
  writePersistedGlossaryDensity,
} from "@/lib/glossary/persisted-prefs"
import {
  getDefaultGlossaryTableColumns,
  type GlossaryDensity,
  type GlossaryTableColumn,
} from "@/lib/glossary/view-options"
import { useLocalizedGlossary } from "@/lib/glossary/use-localized-glossary"
import { cn } from "@/lib/cn"
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs"

const SKELETON_ROWS = 12

function GlossaryTableSkeleton() {
  return (
    <>
      {/* Desktop skeleton */}
      <div
        aria-busy="true"
        aria-label="Loading glossary entries"
        className="border-tech-line/30 relative hidden h-[min(70vh,48rem)] overflow-hidden border md:block">
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
  categories: CategoryFilterCategory[]
  locale: string
  totalCount: number
  children?: React.ReactNode
  className?: string
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

  const localeDefaults = React.useMemo(
    () => getDefaultGlossaryTableColumns(locale),
    [locale]
  )

  const resultCount = entries.length

  const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""))
  const [searchScope, setSearchScope] = useQueryState(
    "scope",
    parseAsStringLiteral(["active", "all"]).withDefault("active")
  )
  const [selectedCategories, setSelectedCategories] = useQueryState(
    "categories",
    parseAsArrayOf(parseAsString).withDefault([])
  )
  const [visibleColumns, setVisibleColumns] = React.useState<
    GlossaryTableColumn[]
  >(() => readPersistedGlossaryColumns(locale) ?? localeDefaults)
  const [density, setDensity] = React.useState<GlossaryDensity>(
    () => readPersistedGlossaryDensity() ?? "normal"
  )

  const handleVisibleColumnsChange = React.useCallback(
    (next: GlossaryTableColumn[]) => {
      setVisibleColumns(next)
      writePersistedGlossaryColumns(locale, next)
    },
    [locale]
  )

  const handleDensityChange = React.useCallback((next: GlossaryDensity) => {
    setDensity(next)
    writePersistedGlossaryDensity(next)
  }, [])
  const [selectedEntry, setSelectedEntry] =
    React.useState<GlossaryIndexEntry | null>(null)
  const isReady = !entriesLoading

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
    () => [...new Set(entries.map((entry) => entry.indexLetter))],
    [entries]
  )

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <section aria-label={t("letterBarLabel")} className="relative z-30">
        <div className="border-tech-main/30 bg-surface-overlay/60 relative flex flex-col gap-3 border p-3 backdrop-blur-sm sm:p-4">
          <div className="grid gap-3 sm:flex sm:flex-row sm:items-center">
            <GlossarySearch
              query={query}
              scope={searchScope}
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
                onChange={handleVisibleColumnsChange}
              />
              <DensityToggle value={density} onChange={handleDensityChange} />
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
          visibleColumns={visibleColumns}
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
        onOpenRelated={openDetailBySlug}
      />

      {children}
    </div>
  )
}
