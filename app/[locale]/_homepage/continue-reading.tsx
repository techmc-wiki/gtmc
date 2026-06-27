"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { articleUrl } from "@/lib/articles/url"
import {
  readBookmark,
  type ReadingBookmark,
} from "@/hooks/use-reading-bookmark"

export function ContinueReading() {
  const t = useTranslations("Homepage")
  const [bookmark] = React.useState<ReadingBookmark | null>(() =>
    typeof window === "undefined" ? null : readBookmark()
  )

  const pct = bookmark ? Math.round(bookmark.progress * 100) : 0
  const progressStyle = React.useMemo(
    (): React.CSSProperties => ({ width: `${pct}%` }),
    [pct]
  )

  if (!bookmark) return null

  return (
    <Link
      href={articleUrl(bookmark.slug)}
      className="group animate-fade-in fill-mode-forwards border-tech-main/40 bg-surface-overlay/80 hover:border-tech-main-dark relative mt-6 flex w-full max-w-md items-center gap-3 border px-4 py-3 opacity-0 backdrop-blur-sm transition-colors [animation-delay:1s] motion-reduce:animate-none motion-reduce:opacity-100">
      <span className="bg-tech-signal absolute -top-px left-4 h-[3px] w-8" />
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-tech-main/60 font-mono text-[0.5625rem] tracking-[0.2em] uppercase">
          {t("continueReading")}
        </span>
        <span className="text-tech-main-dark truncate text-sm font-medium">
          {bookmark.title}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="bg-tech-main/15 relative h-1 w-16 overflow-hidden">
          <span
            className="bg-tech-signal absolute inset-y-0 left-0"
            style={progressStyle}
          />
        </span>
        <span className="text-tech-main/60 font-mono text-[0.625rem]">
          {pct}%
        </span>
        <span className="text-tech-main group-hover:text-tech-main-dark font-mono text-xs transition-colors">
          →
        </span>
      </span>
    </Link>
  )
}
