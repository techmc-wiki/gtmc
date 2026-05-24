"use client"

import * as React from "react"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/cn"
import { parseRelated } from "@/lib/glossary/related"
import type { GlossaryEntry } from "@/lib/glossary/manifest"
import { getActiveLocale, isGlossaryLocale } from "@/lib/glossary/locales"
import { CrossRefChips } from "./cross-ref-chips"

interface GlossaryCardProps {
  entry: GlossaryEntry
  visibleColumns: string[]
  locale: string
  className?: string
}

const labelClass =
  "text-tech-main/40 font-mono text-[0.6875rem] tracking-widest uppercase"

export function GlossaryCard({
  entry,
  visibleColumns,
  locale,
  className,
}: GlossaryCardProps) {
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

  return (
    <article
      className={cn(
        "border-tech-line/30 hover:border-tech-line/60 group flex flex-col gap-2 border bg-white/40 p-3 transition-colors duration-150",
        className
      )}>
      <header className="flex items-baseline justify-between gap-3">
        <Link
          href={`/glossary/${entry.slug}`}
          locale={locale as "en" | "zh"}
          className="text-tech-main-dark hover:text-tech-main font-mono text-base leading-snug font-medium underline-offset-2 hover:underline">
          {entry.fullFormEn}
          {entry.isControversial && (
            <span
              aria-label="controversial"
              className="text-tech-main/40 ml-1 select-none">
              *
            </span>
          )}
        </Link>
        {visible.has("shortForm") && entry.shortForm && (
          <span className="text-tech-main/60 shrink-0 font-mono text-xs">
            {entry.shortForm}
          </span>
        )}
      </header>

      {visible.has("description") && entry.description && (
        <p className="text-tech-main/80 line-clamp-2 text-sm">
          {entry.description}
        </p>
      )}

      {visible.has("translation") && translation && (
        <p className="text-tech-main/70 line-clamp-2 text-sm">
          <span className={cn(labelClass, "mr-2")}>
            {getActiveLocale(locale).toUpperCase()}
          </span>
          {translation.value}
        </p>
      )}

      {visible.has("regex") && entry.regex && (
        <p className="text-tech-main/60 truncate font-mono text-xs">
          <span className={cn(labelClass, "mr-2")}>RX</span>
          {entry.regex}
        </p>
      )}

      {visible.has("related") && relatedTokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={labelClass}>REL</span>
          <CrossRefChips related={relatedTokens} mode="index" locale={locale} />
        </div>
      )}
    </article>
  )
}
