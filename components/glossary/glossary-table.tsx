"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/cn"
import { EmptyState } from "@/components/ui/empty-state"
import { buildGlossarySearchIndex } from "@/lib/glossary/search"
import type { GlossaryEntry } from "@/lib/glossary/manifest"
import { LANGUAGE_DISPLAY, isGlossaryLocale } from "@/lib/glossary/locales"
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
  isReady?: boolean
}

const ALPHA = /[A-Z]/
const VIRTUAL_OVERSCAN = 10
const VIRTUAL_LETTER_ROW_HEIGHT = 48
const VIRTUAL_ROW_HEIGHT = {
  compact: 40,
  normal: 52,
  comfortable: 64,
} as const satisfies Record<GlossaryDensity, number>
const MOBILE_VIRTUAL_ROW_HEIGHT = {
  compact: 112,
  normal: 132,
  comfortable: 156,
} as const satisfies Record<GlossaryDensity, number>

type IndexLocale = "en" | "zh"
type SearchScope = "active" | "all"
type GlossarySearchIndex = ReturnType<typeof buildGlossarySearchIndex>
type VirtualGlossaryRow =
  | { type: "letter"; letter: string; count: number }
  | { type: "entry"; entry: GlossaryEntry }

let searchIndexCache: {
  entries: GlossaryEntry[]
  scope: SearchScope
  locale: IndexLocale
  index: GlossarySearchIndex
} | null = null

function letterBucket(slug: string): string {
  const first = slug[0]?.toUpperCase() ?? "#"
  return ALPHA.test(first) ? first : "#"
}

function getCachedSearchIndex(
  entries: GlossaryEntry[],
  scope: SearchScope,
  locale: IndexLocale
): GlossarySearchIndex {
  if (
    !searchIndexCache ||
    searchIndexCache.entries !== entries ||
    searchIndexCache.scope !== scope ||
    searchIndexCache.locale !== locale
  ) {
    searchIndexCache = {
      entries,
      scope,
      locale,
      index: buildGlossarySearchIndex(entries, scope, locale),
    }
  }

  return searchIndexCache.index
}

const COLUMN_LABEL_KEYS: Record<string, string> = {
  term: "columnTerm",
  shortForm: "columnShortForm",
  category: "columnCategory",
  regex: "columnRegex",
  description: "columnDescription",
  related: "columnRelated",
}

const headerCellBase =
  "text-tech-main/50 border-tech-line/30 sticky top-0 z-10 border-b bg-tech-bg/95 px-3 py-2 text-left font-mono text-xs tracking-widest uppercase backdrop-blur-sm"

function LetterAnchor({ letter, top }: { letter: string; top: number }) {
  const style = React.useMemo<React.CSSProperties>(() => ({ top }), [top])

  return (
    <span
      id={`letter-${letter}`}
      className="absolute scroll-mt-28 md:scroll-mt-32"
      style={style}
    />
  )
}

function VirtualSpacerCell({
  colSpan,
  height,
  label,
}: {
  colSpan: number
  height: number
  label: string
}) {
  const style = React.useMemo<React.CSSProperties>(() => ({ height }), [height])

  return (
    <td aria-label={label} colSpan={colSpan} className="p-0" style={style} />
  )
}

function VirtualLetterRow({
  colCount,
  count,
  letter,
  rowKey,
  size,
}: {
  colCount: number
  count: number
  letter: string
  rowKey: React.Key
  size: number
}) {
  const style = React.useMemo<React.CSSProperties>(
    () => ({ height: size }),
    [size]
  )

  return (
    <tr
      aria-label={`letter ${letter}`}
      key={rowKey}
      className="border-tech-line/30 bg-tech-bg/95 border-b"
      style={style}>
      <td
        aria-label={`letter ${letter}`}
        colSpan={colCount}
        className="px-3 py-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-tech-main-dark font-mono text-2xl font-bold tracking-widest uppercase">
            {letter}
          </h2>
          <span className="text-tech-main/40 font-mono text-xs tracking-widest uppercase">
            {count}
          </span>
        </div>
      </td>
    </tr>
  )
}

function MobileLetterVirtualRow({
  count,
  index,
  letter,
  measureElement,
  start,
  virtualKey,
}: {
  count: number
  index: number
  letter: string
  measureElement: (element: Element | null) => void
  start: number
  virtualKey: React.Key
}) {
  const style = React.useMemo<React.CSSProperties>(
    () => ({ transform: `translateY(${start}px)` }),
    [start]
  )

  return (
    <section
      key={virtualKey}
      ref={measureElement}
      id={`letter-${letter}-mobile`}
      data-index={index}
      aria-label={`letter ${letter}`}
      className="absolute inset-x-0 top-0 scroll-mt-28 pb-2"
      style={style}>
      <div className="border-tech-line/30 flex items-baseline gap-3 border-b pb-1">
        <h2 className="text-tech-main-dark font-mono text-2xl font-bold tracking-widest uppercase">
          {letter}
        </h2>
        <span className="text-tech-main/40 font-mono text-xs tracking-widest uppercase">
          {count}
        </span>
      </div>
    </section>
  )
}

function MobileEntryVirtualRow({
  density,
  entry,
  index,
  isReady,
  locale,
  measureElement,
  onOpenDetail,
  start,
  virtualKey,
  visibleColumns,
  visibleColumnsSet,
}: {
  density: GlossaryDensity
  entry: GlossaryEntry
  index: number
  isReady?: boolean
  locale: string
  measureElement: (element: Element | null) => void
  onOpenDetail?: (entry: GlossaryEntry) => void
  start: number
  virtualKey: React.Key
  visibleColumns: string[]
  visibleColumnsSet: ReadonlySet<string>
}) {
  const style = React.useMemo<React.CSSProperties>(
    () => ({ transform: `translateY(${start}px)` }),
    [start]
  )

  return (
    <div
      key={virtualKey}
      ref={measureElement}
      data-index={index}
      className="absolute inset-x-0 top-0 pb-2"
      style={style}>
      <GlossaryCard
        entry={entry}
        visibleColumns={visibleColumns}
        visibleColumnsSet={visibleColumnsSet}
        locale={locale}
        density={density}
        onOpenDetail={onOpenDetail}
        isReady={isReady}
      />
    </div>
  )
}

function normalizeLocaleForIndex(locale: string): "en" | "zh" {
  return locale === "zh" ? "zh" : "en"
}

function getTranslationColumnLabel(
  column: string,
  descriptionLabel: string
): string | null {
  const [, locale, field] = column.split(":")
  if (!isGlossaryLocale(locale)) return null
  if (field === "term") return LANGUAGE_DISPLAY[locale]
  if (field === "description") {
    return `${descriptionLabel} (${LANGUAGE_DISPLAY[locale]})`
  }
  return null
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
  isReady,
}: GlossaryTableProps) {
  const t = useTranslations("Glossary")
  const tableScrollRef = React.useRef<HTMLDivElement>(null)
  const mobileScrollRef = React.useRef<HTMLDivElement>(null)

  const indexLocale = normalizeLocaleForIndex(locale)

  const categoryFiltered = React.useMemo(() => {
    if (selectedCategories.length === 0) return entries
    const allow = new Set(selectedCategories)
    return entries.filter((e) => allow.has(e.category))
  }, [entries, selectedCategories])

  const trimmedQuery = query.trim()

  const filteredEntries = React.useMemo(() => {
    if (!trimmedQuery) return categoryFiltered

    const index = getCachedSearchIndex(
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

  const virtualRows = React.useMemo<VirtualGlossaryRow[]>(() => {
    const rows: VirtualGlossaryRow[] = []
    for (const group of grouped) {
      if (group.letter !== "_results") {
        rows.push({
          type: "letter",
          letter: group.letter,
          count: group.items.length,
        })
      }
      for (const entry of group.items) {
        rows.push({ type: "entry", entry })
      }
    }
    return rows
  }, [grouped])

  const rowHeight = VIRTUAL_ROW_HEIGHT[density]
  const mobileRowHeight = MOBILE_VIRTUAL_ROW_HEIGHT[density]
  const visibleColumnsSet = React.useMemo(
    () => new Set(visibleColumns),
    [visibleColumns]
  )

  const letterOffsets = React.useMemo(() => {
    let offset = 0
    const offsets: { letter: string; top: number }[] = []
    for (const row of virtualRows) {
      if (row.type === "letter") {
        offsets.push({ letter: row.letter, top: offset })
        offset += VIRTUAL_LETTER_ROW_HEIGHT
      } else {
        offset += rowHeight
      }
    }
    return offsets
  }, [rowHeight, virtualRows])

  const rowVirtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: (index) =>
      virtualRows[index]?.type === "letter"
        ? VIRTUAL_LETTER_ROW_HEIGHT
        : rowHeight,
    overscan: VIRTUAL_OVERSCAN,
  })

  const mobileVirtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => mobileScrollRef.current,
    estimateSize: (index) =>
      virtualRows[index]?.type === "letter"
        ? VIRTUAL_LETTER_ROW_HEIGHT
        : mobileRowHeight,
    overscan: VIRTUAL_OVERSCAN,
    measureElement: (element) => element.getBoundingClientRect().height,
  })

  const mobileTotalSize = mobileVirtualizer.getTotalSize()
  const mobileTotalSizeStyle = React.useMemo<React.CSSProperties>(
    () => ({ height: mobileTotalSize }),
    [mobileTotalSize]
  )

  const virtualItems = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualItems[0]?.start ?? 0
  const paddingBottom =
    virtualItems.length > 0
      ? Math.max(
          rowVirtualizer.getTotalSize() -
            (virtualItems[virtualItems.length - 1]?.end ?? 0),
          0
        )
      : 0

  if (filteredEntries.length === 0) {
    return (
      <div className={className}>
        <EmptyState message={t("noResults")} />
      </div>
    )
  }

  const colCount = visibleColumns.length || 1
  const mobileVirtualItems = mobileVirtualizer.getVirtualItems()

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <div
        ref={tableScrollRef}
        className="border-tech-line/30 custom-bottom-scrollbar relative hidden h-[min(70vh,48rem)] overflow-auto border md:block"
        data-density={density}>
        {letterOffsets.length > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-0">
            {letterOffsets.map(({ letter, top }) => (
              <LetterAnchor key={letter} letter={letter} top={top} />
            ))}
          </div>
        )}
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {visibleColumns.map((col) => {
                const key = COLUMN_LABEL_KEYS[col]
                const translationLabel = getTranslationColumnLabel(
                  col,
                  t("columnDescription")
                )
                return (
                  <th
                    key={col}
                    scope="col"
                    className={cn(
                      headerCellBase,
                      col === "term" && "min-w-[10rem]",
                      col === "description" && "max-w-[36rem]",
                      col.startsWith("translation:") && "max-w-[24rem]"
                    )}>
                    {translationLabel ??
                      (key ? t(key as Parameters<typeof t>[0]) : col)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <VirtualSpacerCell
                  label="virtual table top spacer"
                  colSpan={colCount}
                  height={paddingTop}
                />
              </tr>
            )}
            {virtualItems.map((virtualItem) => {
              const row = virtualRows[virtualItem.index]
              if (!row) return null
              if (row.type === "letter") {
                return (
                  <VirtualLetterRow
                    key={virtualItem.key}
                    rowKey={virtualItem.key}
                    letter={row.letter}
                    count={row.count}
                    colCount={colCount}
                    size={virtualItem.size}
                  />
                )
              }

              return (
                <GlossaryTableRow
                  key={virtualItem.key}
                  entry={row.entry}
                  visibleColumns={visibleColumns}
                  density={density}
                  locale={locale}
                  onOpenDetail={onOpenDetail}
                  isReady={isReady}
                />
              )
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden="true">
                <VirtualSpacerCell
                  label="virtual table bottom spacer"
                  colSpan={colCount}
                  height={paddingBottom}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        ref={mobileScrollRef}
        className="custom-bottom-scrollbar relative h-[min(75vh,44rem)] overflow-auto md:hidden"
        data-density={density}>
        <div className="relative w-full" style={mobileTotalSizeStyle}>
          {mobileVirtualItems.map((virtualItem) => {
            const row = virtualRows[virtualItem.index]
            if (!row) return null

            if (row.type === "letter") {
              return (
                <MobileLetterVirtualRow
                  key={virtualItem.key}
                  virtualKey={virtualItem.key}
                  letter={row.letter}
                  count={row.count}
                  index={virtualItem.index}
                  start={virtualItem.start}
                  measureElement={mobileVirtualizer.measureElement}
                />
              )
            }

            return (
              <MobileEntryVirtualRow
                key={virtualItem.key}
                virtualKey={virtualItem.key}
                entry={row.entry}
                index={virtualItem.index}
                start={virtualItem.start}
                measureElement={mobileVirtualizer.measureElement}
                visibleColumns={visibleColumns}
                visibleColumnsSet={visibleColumnsSet}
                locale={locale}
                density={density}
                onOpenDetail={onOpenDetail}
                isReady={isReady}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
