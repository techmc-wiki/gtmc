"use client"

import * as React from "react"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/cn"
import { generateSlug } from "@/lib/glossary/slug"
import type { ParsedRelatedToken } from "@/lib/glossary/related"

interface CrossRefChipsProps {
  related: ParsedRelatedToken[]
  /**
   * `index` — link to in-page letter anchor (`#letter-{X}`) on the index page.
   * `detail` — full route link to `/{locale}/glossary/{slug}` for use on detail pages.
   */
  mode: "index" | "detail"
  locale: string
  className?: string
}

function letterBucketFromTarget(target: string): string {
  const trimmed = target.trim()
  if (!trimmed) return "#"
  const first = trimmed[0]?.toUpperCase() ?? "#"
  return /[A-Z]/.test(first) ? first : "#"
}

const chipBase =
  "border-tech-line/40 text-tech-main/80 hover:text-tech-main hover:outline-tech-main/30 focus-visible:outline-tech-main inline-flex items-center border bg-transparent px-1.5 py-0.5 font-mono text-xs leading-none transition-[outline-color,color] duration-150 hover:outline hover:outline-1 focus-visible:outline focus-visible:outline-1 [text-decoration-line:underline] [text-decoration-style:dotted] [text-underline-offset:3px]"

const labelMap = {
  synonym: "syn:",
  see: "see:",
} as const satisfies Record<ParsedRelatedToken["kind"], string>

export function CrossRefChips({
  related,
  mode,
  locale,
  className,
}: CrossRefChipsProps) {
  if (related.length === 0) return null

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-x-1 gap-y-1",
        className
      )}>
      {related.map((entry, index) => {
        const isLast = index === related.length - 1
        const display = `${labelMap[entry.kind]}${entry.target}`
        const key = `${entry.kind}-${entry.target}-${index}`

        const chip =
          mode === "index" ? (
            <a
              href={`#letter-${letterBucketFromTarget(entry.target)}`}
              className={chipBase}
              title={entry.target}>
              {display}
            </a>
          ) : (
            <Link
              href={`/glossary/${generateSlug(entry.target)}`}
              locale={locale as "en" | "zh"}
              className={chipBase}
              title={entry.target}>
              {display}
            </Link>
          )

        return (
          <React.Fragment key={key}>
            {chip}
            {!isLast && (
              <span aria-hidden="true" className="text-tech-main/30">
                ,
              </span>
            )}
          </React.Fragment>
        )
      })}
    </span>
  )
}
