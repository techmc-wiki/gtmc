"use client"

import * as React from "react"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/cn"
import { parseRelated } from "@/lib/glossary/related"
import type { GlossaryEntry, GlossaryLocale } from "@/lib/glossary/manifest"
import { isGlossaryLocale } from "@/lib/glossary/locales"
import { CrossRefChips } from "./cross-ref-chips"

export type GlossaryDensity = "compact" | "normal" | "comfortable"

interface GlossaryTableRowProps {
  entry: GlossaryEntry
  visibleColumns: string[]
  density: GlossaryDensity
  locale: string
  onOpenDetail?: (entry: GlossaryEntry) => void
}

const densityRowPadding = {
  compact: "py-1",
  normal: "py-2",
  comfortable: "py-3",
} as const satisfies Record<GlossaryDensity, string>

const cellBase =
  "px-3 align-top text-sm transition-[padding] duration-300 ease-out motion-reduce:transition-none"
const termTriggerClass =
  "text-tech-main-dark hover:text-tech-main focus-visible:outline-tech-main cursor-pointer text-left font-mono font-medium tracking-tight underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"

function parseTranslationColumn(
  column: string
): { locale: GlossaryLocale; field: "term" | "description" } | null {
  const [, locale, field] = column.split(":")
  if (!isGlossaryLocale(locale)) return null
  if (field !== "term" && field !== "description") return null
  return { locale, field }
}

export function GlossaryTableRow({
  entry,
  visibleColumns,
  density,
  locale,
  onOpenDetail,
}: GlossaryTableRowProps) {
  const padding = densityRowPadding[density]

  const relatedTokens = React.useMemo(
    () => parseRelated(entry.related),
    [entry.related]
  )

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
    <tr
      data-density={density}
      className="border-tech-line/10 hover:bg-tech-accent/5 border-b transition-colors duration-150">
      {visibleColumns.map((column) => {
        const translationColumn = parseTranslationColumn(column)
        if (translationColumn) {
          const translation = entry.translations[translationColumn.locale]
          const value =
            translationColumn.field === "term"
              ? translation?.value
              : translation?.description

          return (
            <td
              key={column}
              className={cn(
                cellBase,
                padding,
                "text-tech-main/80 max-w-[24rem]"
              )}>
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
              <td
                key={column}
                className={cn(cellBase, padding, "min-w-[10rem]")}>
                <Link
                  href={`/glossary/${entry.slug}`}
                  locale={locale as "en" | "zh"}
                  onClick={handleOpenDetail}
                  className={termTriggerClass}>
                  {entry.fullFormEn}
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
                  cellBase,
                  padding,
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
                  cellBase,
                  padding,
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
                  cellBase,
                  padding,
                  "text-tech-main/60 font-mono text-xs"
                )}>
                {entry.regex || ""}
              </td>
            )

          case "description":
            return (
              <td
                key={column}
                className={cn(
                  cellBase,
                  padding,
                  "text-tech-main/80 max-w-[36rem]"
                )}>
                <span className="line-clamp-2">{entry.description}</span>
              </td>
            )

          case "related":
            return (
              <td key={column} className={cn(cellBase, padding)}>
                {relatedTokens.length > 0 ? (
                  <CrossRefChips
                    related={relatedTokens}
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
