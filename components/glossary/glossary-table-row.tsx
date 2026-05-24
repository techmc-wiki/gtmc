"use client"

import * as React from "react"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/cn"
import { parseRelated } from "@/lib/glossary/related"
import type { GlossaryEntry } from "@/lib/glossary/manifest"
import { getActiveLocale, isGlossaryLocale } from "@/lib/glossary/locales"
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

export function GlossaryTableRow({
  entry,
  visibleColumns,
  density,
  locale,
  onOpenDetail,
}: GlossaryTableRowProps) {
  const padding = densityRowPadding[density]
  const visible = React.useMemo(() => new Set(visibleColumns), [visibleColumns])

  const relatedTokens = React.useMemo(
    () => parseRelated(entry.related),
    [entry.related]
  )

  const translation = React.useMemo(() => {
    if (!isGlossaryLocale(locale)) return null
    const code = getActiveLocale(locale)
    return entry.translations[code] ?? null
  }, [entry.translations, locale])

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
      {visible.has("term") && (
        <td className={cn(cellBase, padding, "min-w-[10rem]")}>
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
      )}

      {visible.has("shortForm") && (
        <td
          className={cn(
            cellBase,
            padding,
            "text-tech-main/70 font-mono text-xs"
          )}>
          {entry.shortForm || ""}
        </td>
      )}

      {visible.has("regex") && (
        <td
          className={cn(
            cellBase,
            padding,
            "text-tech-main/60 font-mono text-xs"
          )}>
          {entry.regex || ""}
        </td>
      )}

      {visible.has("description") && (
        <td
          className={cn(cellBase, padding, "text-tech-main/80 max-w-[36rem]")}>
          <span className="line-clamp-2">{entry.description}</span>
        </td>
      )}

      {visible.has("translation") && (
        <td
          className={cn(cellBase, padding, "text-tech-main/80 max-w-[24rem]")}>
          {translation ? (
            <span className="line-clamp-2">{translation.value}</span>
          ) : (
            <span className="text-tech-main/30 font-mono text-xs">—</span>
          )}
        </td>
      )}

      {visible.has("related") && (
        <td className={cn(cellBase, padding)}>
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
      )}
    </tr>
  )
}
