"use client"

import { useTranslations } from "next-intl"
import { Asterisk } from "lucide-react"
import { cn } from "@/lib/cn"
import {
  getPrimaryGlossaryContent,
  type GlossaryIndexEntry,
} from "@/lib/glossary/localized-index"
import type { GlossaryColumn } from "@/lib/glossary/view-options"

interface GlossaryEntryViewProps {
  entry: GlossaryIndexEntry
  visibleColumns: GlossaryColumn[]
  locale: string
  onOpenDetail?: (entry: GlossaryIndexEntry) => void
  isReady?: boolean
}
const termTriggerClass =
  "text-tech-main-dark hover:text-tech-main focus-visible:outline-tech-main cursor-pointer text-left font-mono font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"

function ControversialMark({ label }: { label: string }) {
  return (
    <span title={label} className="text-tech-main/40 ml-1 select-none">
      <Asterisk aria-hidden="true" className="size-3" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function GlossaryCard({
  entry,
  visibleColumns,
  locale,
  onOpenDetail,
  className,
  isReady,
}: GlossaryEntryViewProps & {
  className?: string
}) {
  const primaryContent = getPrimaryGlossaryContent(entry, locale)
  const t = useTranslations("Glossary")
  const showShortForm = visibleColumns.includes("shortForm")
  const showDescription = visibleColumns.includes("description")

  return (
    <article
      className={cn(
        "border-tech-line/30 hover:border-tech-line/60 bg-surface-overlay/40 flex flex-col gap-2 border p-3 ease-out motion-reduce:transition-none",
        isReady
          ? "transition-[padding,gap,border-color,background-color] duration-300"
          : "transition-[border-color,background-color] duration-150",
        className
      )}>
      <header className="flex items-baseline justify-between gap-3">
        <a
          href={`/${locale}/glossary/${encodeURIComponent(entry.slug)}`}
          onClick={(event) => {
            if (!onOpenDetail) return
            event.preventDefault()
            onOpenDetail(entry)
          }}
          className={cn(termTriggerClass, "text-base leading-snug")}>
          {primaryContent.value}
          {entry.isControversial && (
            <ControversialMark label={t("controversialBadge")} />
          )}
        </a>
        {showShortForm && entry.shortForm && (
          <span className="text-tech-main/60 shrink-0 font-mono text-xs">
            {entry.shortForm}
          </span>
        )}
      </header>

      {showDescription && primaryContent.description && (
        <p className="text-tech-main/80 line-clamp-2 text-sm">
          {primaryContent.description}
        </p>
      )}
    </article>
  )
}

const cellBase = "px-3 py-2 align-top text-sm motion-reduce:transition-none"

export function GlossaryTableRow({
  entry,
  visibleColumns,
  locale,
  onOpenDetail,
  isReady,
}: GlossaryEntryViewProps) {
  const t = useTranslations("Glossary")
  const primaryContent = getPrimaryGlossaryContent(entry, locale)
  const cellClass = cn(
    cellBase,
    isReady && "transition-[padding] duration-300 ease-out"
  )

  return (
    <tr className="border-tech-line/10 hover:bg-tech-accent/5 border-b transition-colors duration-150">
      {visibleColumns.map((column) => {
        if (column === "shortForm") {
          return (
            <td
              key={column}
              className={cn(cellClass, "text-tech-main/70 font-mono text-xs")}>
              {entry.shortForm || ""}
            </td>
          )
        }
        if (column === "description") {
          return (
            <td
              key={column}
              className={cn(cellClass, "text-tech-main/80 max-w-[36rem]")}>
              <span className="line-clamp-2">{primaryContent.description}</span>
            </td>
          )
        }
        return (
          <td key={column} className={cn(cellClass, "min-w-[10rem]")}>
            <a
              href={`/${locale}/glossary/${encodeURIComponent(entry.slug)}`}
              onClick={(event) => {
                if (!onOpenDetail) return
                event.preventDefault()
                onOpenDetail(entry)
              }}
              className={cn(termTriggerClass, "tracking-tight")}>
              {primaryContent.value}
            </a>
            {entry.isControversial && (
              <ControversialMark label={t("controversialBadge")} />
            )}
          </td>
        )
      })}
    </tr>
  )
}
