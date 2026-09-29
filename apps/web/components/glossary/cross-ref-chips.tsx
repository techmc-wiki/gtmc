"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import type { GlossaryIndexRelatedTerm } from "@/lib/glossary/localized-index"
import { generateSlug } from "@/lib/glossary/slug"
import type { ParsedRelatedToken } from "@/lib/glossary/related"

interface CrossRefChipsBaseProps {
  className?: string
}

type CrossRefChipsProps = CrossRefChipsBaseProps &
  (
    | { mode: "index"; related: GlossaryIndexRelatedTerm[] }
    | {
        mode: "detail"
        related: ParsedRelatedToken[]
        onOpenDetail: (slug: string) => void
        locale: string
      }
  )

const chipBase =
  "border-tech-line/40 text-tech-main/80 hover:text-tech-main hover:outline-tech-main/30 focus-visible:outline-tech-main inline-flex items-center border bg-transparent px-1.5 py-0.5 font-mono text-xs leading-none transition-[outline-color,color] duration-150 hover:outline hover:outline-1 focus-visible:outline focus-visible:outline-1 [text-decoration-line:underline] [text-decoration-style:dotted] [text-underline-offset:3px]"

const labelMap = {
  synonym: "syn:",
  see: "see:",
} as const satisfies Record<ParsedRelatedToken["kind"], string>

export function CrossRefChips(props: CrossRefChipsProps) {
  const { related, className } = props
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
        const key = `${entry.kind}-${entry.target}`

        let chip: React.ReactNode
        if (props.mode === "index") {
          const indexedEntry = props.related[index]
          if (!indexedEntry) return null
          chip = (
            <a
              href={`#letter-${indexedEntry.indexLetter}`}
              className={chipBase}
              title={entry.target}>
              {display}
            </a>
          )
        } else {
          chip = (
            <button
              type="button"
              onClick={() => props.onOpenDetail(generateSlug(entry.target))}
              className={cn(chipBase, "cursor-pointer")}
              title={entry.target}>
              {display}
            </button>
          )
        }

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
