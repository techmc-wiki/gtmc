"use client"

import { useState, useCallback, useMemo } from "react"
import { ArrowRight, ChevronDown } from "lucide-react"
import { HeroCard } from "./hero-card"
import { Button } from "@/components/ui/shadcn/button"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useReadingBookmark } from "@/hooks/use-reading-bookmark"
import { articleUrl } from "@/lib/articles/url"

export function HomepageClient() {
  const t = useTranslations("Homepage")
  const [isAccessingDatabase, setIsAccessingDatabase] = useState(false)

  const handleArticlesClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (isAccessingDatabase) {
        event.preventDefault()
        return
      }
      setIsAccessingDatabase(true)
    },
    [isAccessingDatabase]
  )

  return (
    <div className="relative z-10 mx-auto flex min-h-full w-full max-w-7xl flex-col items-center justify-center px-4">
      <HeroCard />

      <div className="relative z-20 flex w-full max-w-48 flex-col items-stretch justify-center gap-5 sm:w-full sm:max-w-full sm:flex-row sm:items-center">
        <Button
          asChild
          aria-disabled={isAccessingDatabase}
          className={`flex h-12 w-full items-center justify-center text-xs tracking-widest uppercase shadow-md transition-transform duration-300 hover:scale-102 active:scale-95 ${
            isAccessingDatabase
              ? "pointer-events-none cursor-wait opacity-90"
              : ""
          } sm:w-72 sm:text-sm`}>
          <Link href="/articles/preface" onClick={handleArticlesClick}>
            {isAccessingDatabase ? (
              <>
                <span className="bg-surface inline-block size-2 animate-pulse motion-reduce:animate-none" />
                {t("initializing")}
              </>
            ) : (
              <>
                {t("startReading")}
                <ArrowRight aria-hidden="true" />
              </>
            )}
          </Link>
        </Button>
      </div>

      <ContinueReading />

      <a
        href="#contents"
        className="group absolute inset-x-0 bottom-4 flex flex-col items-center gap-1.5">
        <span className="text-tech-main/60 group-hover:text-tech-main-dark font-mono text-[0.625rem] tracking-[0.25em] uppercase transition-colors">
          {t("scrollHint")}
        </span>
        <span className="text-tech-main/60 group-hover:text-tech-main-dark animate-bounce text-xs transition-colors motion-reduce:animate-none">
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </span>
      </a>
    </div>
  )
}

function ContinueReading() {
  const t = useTranslations("Homepage")
  const bookmark = useReadingBookmark()

  const pct = bookmark ? Math.round(bookmark.progress * 100) : 0
  const progressStyle = useMemo(
    (): React.CSSProperties => ({ width: `${pct}%` }),
    [pct]
  )

  if (!bookmark) return null

  return (
    <Link
      href={articleUrl(bookmark.slug)}
      className="group border-tech-main/40 bg-surface-overlay/80 hover:border-tech-main-dark relative mt-6 flex w-full max-w-md items-center gap-3 border px-4 py-3 backdrop-blur-sm transition-colors">
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
        <ArrowRight
          aria-hidden="true"
          className="text-tech-main group-hover:text-tech-main-dark size-3.5 transition-colors"
        />
      </span>
    </Link>
  )
}
