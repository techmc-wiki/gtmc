"use client"

import * as React from "react"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/cn"
import {
  getGlossaryContent,
  getPrimaryGlossaryContent,
  type GlossaryIndexEntry,
} from "@/lib/glossary/localized-index"
import {
  getGlossaryDisplayName,
  parseGlossaryTranslationColumn,
  type GlossaryDensity,
  type GlossaryTableColumn,
} from "@/lib/glossary/view-options"
import { CrossRefChips } from "./cross-ref-chips"

interface GlossaryEntryViewProps {
  entry: GlossaryIndexEntry
  visibleColumns: GlossaryTableColumn[]
  locale: string
  density: GlossaryDensity
  onOpenDetail?: (entry: GlossaryIndexEntry) => void
  isReady?: boolean
}

/**
 * Opens the detail panel for plain left-clicks; lets modifier-clicks fall
 * through to the actual route link.
 */
function useOpenDetailHandler(
  entry: GlossaryIndexEntry,
  onOpenDetail?: (entry: GlossaryIndexEntry) => void
) {
  return React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!onOpenDetail) return
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return
      }
      event.preventDefault()
      onOpenDetail(entry)
    },
    [entry, onOpenDetail]
  )
}

const termTriggerClass =
  "text-tech-main-dark hover:text-tech-main focus-visible:outline-tech-main cursor-pointer text-left font-mono font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
const labelClass =
  "text-tech-main/40 font-mono text-[0.6875rem] tracking-widest uppercase"
const densityCardClass = {
  compact: "gap-1.5 p-2.5",
  normal: "gap-2 p-3",
  comfortable: "gap-3 p-4",
} as const satisfies Record<GlossaryDensity, string>

/** Mobile/index-card rendering of one glossary entry. */
export function GlossaryCard({
  entry,
  visibleColumns,
  visibleColumnsSet,
  locale,
  density,
  onOpenDetail,
  className,
  isReady,
}: GlossaryEntryViewProps & {
  visibleColumnsSet: ReadonlySet<string>
  className?: string
}) {
  const primaryContent = getPrimaryGlossaryContent(entry, locale)
  const handleOpenDetail = useOpenDetailHandler(entry, onOpenDetail)

  return (
    <article
      data-density={density}
      className={cn(
        "border-tech-line/30 hover:border-tech-line/60 group bg-surface-overlay/40 flex flex-col border ease-out motion-reduce:transition-none",
        isReady
          ? "transition-[padding,gap,border-color,background-color] duration-300"
          : "transition-[border-color,background-color] duration-150",
        densityCardClass[density],
        className
      )}>
      <header className="flex items-baseline justify-between gap-3">
        <Link
          href={`/glossary/${entry.slug}`}
          locale={locale as "en" | "zh"}
          onClick={handleOpenDetail}
          className={cn(termTriggerClass, "text-base leading-snug")}>
          {primaryContent.value}
          {entry.isControversial && (
            <span
              aria-label="controversial"
              className="text-tech-main/40 ml-1 select-none">
              *
            </span>
          )}
        </Link>
        {visibleColumnsSet.has("shortForm") && entry.shortForm && (
          <span className="text-tech-main/60 shrink-0 font-mono text-xs">
            {entry.shortForm}
          </span>
        )}
      </header>

      {visibleColumns.map((column) => {
        const translationColumn = parseGlossaryTranslationColumn(column)
        if (translationColumn) {
          const translation = getGlossaryContent(
            entry,
            translationColumn.locale
          )
          const value =
            translationColumn.field === "term"
              ? translation?.value
              : translation?.description
          if (!value) return null

          return (
            <p key={column} className="text-tech-main/70 line-clamp-2 text-sm">
              <span className={cn(labelClass, "mr-2")}>
                {translationColumn.field === "term"
                  ? getGlossaryDisplayName(translationColumn.locale)
                  : `DESC ${getGlossaryDisplayName(translationColumn.locale)}`}
              </span>
              {value}
            </p>
          )
        }

        switch (column) {
          case "category":
            if (!entry.category) return null
            return (
              <p key={column} className="text-tech-main/60 font-mono text-xs">
                <span className={cn(labelClass, "mr-2")}>CAT</span>
                {entry.category}
              </p>
            )

          case "description":
            if (!primaryContent.description) return null
            return (
              <p
                key={column}
                className="text-tech-main/80 line-clamp-2 text-sm">
                {primaryContent.description}
              </p>
            )

          case "regex":
            if (!entry.regex) return null
            return (
              <p
                key={column}
                className="text-tech-main/60 truncate font-mono text-xs">
                <span className={cn(labelClass, "mr-2")}>RX</span>
                {entry.regex}
              </p>
            )

          case "related":
            if (entry.relatedTerms.length === 0) return null
            return (
              <div
                key={column}
                className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={labelClass}>REL</span>
                <CrossRefChips
                  related={entry.relatedTerms}
                  mode="index"
                  locale={locale}
                />
              </div>
            )

          default:
            return null
        }
      })}
    </article>
  )
}

const cellBase = "px-3 align-top text-sm motion-reduce:transition-none"
const densityRowPadding = {
  compact: "py-1",
  normal: "py-2",
  comfortable: "py-3",
} as const satisfies Record<GlossaryDensity, string>

/** Desktop/table rendering of one glossary entry. */
export function GlossaryTableRow({
  entry,
  visibleColumns,
  density,
  locale,
  onOpenDetail,
  isReady,
}: GlossaryEntryViewProps) {
  const padding = densityRowPadding[density]
  const cellClass = cn(
    cellBase,
    padding,
    isReady && "transition-[padding] duration-300 ease-out"
  )

  const primaryContent = getPrimaryGlossaryContent(entry, locale)
  const handleOpenDetail = useOpenDetailHandler(entry, onOpenDetail)

  return (
    <tr
      data-density={density}
      className="border-tech-line/10 hover:bg-tech-accent/5 border-b transition-colors duration-150">
      {visibleColumns.map((column) => {
        const translationColumn = parseGlossaryTranslationColumn(column)
        if (translationColumn) {
          const translation = getGlossaryContent(
            entry,
            translationColumn.locale
          )
          const value =
            translationColumn.field === "term"
              ? translation?.value
              : translation?.description

          return (
            <td
              key={column}
              className={cn(cellClass, "text-tech-main/80 max-w-[24rem]")}>
              {value ? (
                <span className="line-clamp-2">{value}</span>
              ) : (
                <span className="text-tech-main/30 font-mono text-xs">—</span>
              )}
            </td>
          )
        }

        switch (column) {
          case "term":
            return (
              <td key={column} className={cn(cellClass, "min-w-[10rem]")}>
                <Link
                  href={`/glossary/${entry.slug}`}
                  locale={locale as "en" | "zh"}
                  onClick={handleOpenDetail}
                  className={cn(termTriggerClass, "tracking-tight")}>
                  {primaryContent.value}
                </Link>
                {entry.isControversial && (
                  <span
                    aria-label="controversial"
                    title="controversial"
                    className="text-tech-main/40 ml-1 font-mono text-xs select-none">
                    *
                  </span>
                )}
              </td>
            )

          case "shortForm":
            return (
              <td
                key={column}
                className={cn(
                  cellClass,
                  "text-tech-main/70 font-mono text-xs"
                )}>
                {entry.shortForm || ""}
              </td>
            )

          case "category":
            return (
              <td
                key={column}
                className={cn(
                  cellClass,
                  "text-tech-main/60 font-mono text-xs"
                )}>
                {entry.category || ""}
              </td>
            )

          case "regex":
            return (
              <td
                key={column}
                className={cn(
                  cellClass,
                  "text-tech-main/60 font-mono text-xs"
                )}>
                {entry.regex || ""}
              </td>
            )

          case "description":
            return (
              <td
                key={column}
                className={cn(cellClass, "text-tech-main/80 max-w-[36rem]")}>
                <span className="line-clamp-2">
                  {primaryContent.description}
                </span>
              </td>
            )

          case "related":
            return (
              <td key={column} className={cellClass}>
                {entry.relatedTerms.length > 0 ? (
                  <CrossRefChips
                    related={entry.relatedTerms}
                    mode="index"
                    locale={locale}
                  />
                ) : (
                  <span className="text-tech-main/30 font-mono text-xs">—</span>
                )}
              </td>
            )

          default:
            return null
        }
      })}
    </tr>
  )
}
