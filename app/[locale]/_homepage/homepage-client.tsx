"use client"

import { useState, useCallback } from "react"
import { HeroCard } from "./hero-card"
import { Button } from "@/components/ui/shadcn/button"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { ContinueReading } from "./continue-reading"

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

      <div className="animate-slide-up-fade fill-mode-forwards relative z-20 flex w-full max-w-48 flex-col items-stretch justify-center gap-5 opacity-0 [animation-delay:0.6s] motion-reduce:animate-none sm:w-full sm:max-w-full sm:flex-row sm:items-center">
        <Button
          asChild
          variant="primary"
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
              t("startReading")
            )}
          </Link>
        </Button>
      </div>

      <ContinueReading />

      <a
        href="#contents"
        className="group animate-fade-in fill-mode-forwards absolute inset-x-0 bottom-4 flex flex-col items-center gap-1.5 opacity-0 [animation-delay:1.8s] motion-reduce:animate-none motion-reduce:opacity-100">
        <span className="text-tech-main/60 group-hover:text-tech-main-dark font-mono text-[0.625rem] tracking-[0.25em] uppercase transition-colors">
          {t("scrollHint")}
        </span>
        <span className="text-tech-main/60 group-hover:text-tech-main-dark animate-bounce text-xs transition-colors motion-reduce:animate-none">
          ▼
        </span>
      </a>
    </div>
  )
}
