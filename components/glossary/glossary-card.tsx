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

interface GlossaryCardProps {
  entry: GlossaryIndexEntry
  visibleColumns: GlossaryTableColumn[]
  visibleColumnsSet: ReadonlySet<string>
  locale: string
  density: GlossaryDensity
  onOpenDetail?: (entry: GlossaryIndexEntry) => void
  className?: string
  isReady?: boolean
}

const labelClass =
  "text-tech-main/40 font-mono text-[0.6875rem] tracking-widest uppercase"
const termTriggerClass =
  "text-tech-main-dark hover:text-tech-main focus-visible:outline-tech-main cursor-pointer text-left font-mono text-base leading-snug font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
const densityCardClass = {
  compact: "gap-1.5 p-2.5",
  normal: "gap-2 p-3",
  comfortable: "gap-3 p-4",
} as const satisfies Record<GlossaryDensity, string>

export function GlossaryCard({
  entry,
  visibleColumns,
  visibleColumnsSet,
  locale,
  density,
  onOpenDetail,
  className,
  isReady,
}: GlossaryCardProps) {
  const primaryContent = getPrimaryGlossaryContent(entry, locale)

  const handleOpenDetail = React.useCallback(
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
          className={termTriggerClass}>
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
