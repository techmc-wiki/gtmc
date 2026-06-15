"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "@/i18n/navigation"
import { useHomepageMotion } from "./use-homepage-motion"
import { HOMEPAGE_MOTION } from "./homepage-constants"
import { HeroCard } from "./hero-card"
import { TechButton } from "@/components/ui/tech-button"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { ContinueReading } from "./continue-reading"

const BackgroundLayer = dynamic(
  () => import("./background-layer").then((mod) => mod.BackgroundLayer),
  { ssr: false }
)
const MidgroundLayer = dynamic(
  () => import("./midground-layer").then((mod) => mod.MidgroundLayer),
  { ssr: false }
)

export function HomepageClient() {
  const router = useRouter()
  const t = useTranslations("Homepage")
  const motionDriver = useHomepageMotion()
  const [isAccessingDatabase, setIsAccessingDatabase] = useState(false)
  const [cardWidth, setCardWidth] = useState(900)
  const cardRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return
    }
    router.prefetch("/articles")
  }, [router])

  useEffect(() => {
    if (!cardRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCardWidth(Math.round(entry.contentRect.width))
      }
    })

    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  const {
    background: bgTransform,
    midground: mgTransform,
    foreground: fgTransform,
    smoothMouseX,
    smoothMouseY,
    isReducedMotion,
  } = motionDriver

  const bgBlurMax = isReducedMotion ? 0 : HOMEPAGE_MOTION.blurMax.background
  const mgBlurMax = isReducedMotion ? 0 : HOMEPAGE_MOTION.blurMax.midground

  return (
    <>
      <BackgroundLayer
        bgTransform={bgTransform}
        smoothMouseX={smoothMouseX}
        smoothMouseY={smoothMouseY}
        blurMax={bgBlurMax}
        isReducedMotion={isReducedMotion}
      />

      <MidgroundLayer
        mgTransform={mgTransform}
        smoothMouseX={smoothMouseX}
        smoothMouseY={smoothMouseY}
        blurMax={mgBlurMax}
        isReducedMotion={isReducedMotion}
      />

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-7xl flex-col items-center justify-center">
        <HeroCard
          cardRef={cardRef}
          cardWidth={cardWidth}
          fgTransform={fgTransform}
        />

        <div className="animate-slide-up-fade fill-mode-forwards relative z-20 flex w-full max-w-48 flex-col items-stretch justify-center gap-5 opacity-0 [animation-delay:0.6s] motion-reduce:animate-none motion-reduce:opacity-100 sm:w-full sm:max-w-full sm:flex-row sm:items-center">
          <Link
            href="/articles"
            prefetch
            onClick={handleArticlesClick}
            className="w-full sm:w-72">
            <TechButton
              variant="primary"
              disabled={isAccessingDatabase}
              className="flex h-12 w-full items-center justify-center text-xs tracking-widest uppercase shadow-md transition-transform duration-300 hover:scale-102 active:scale-95 disabled:cursor-wait disabled:opacity-90 sm:text-sm">
              {isAccessingDatabase ? (
                <>
                  <span className="bg-surface inline-block size-2 animate-pulse motion-reduce:animate-none" />
                  {t("initializing")}
                </>
              ) : (
                t("startReading")
              )}
            </TechButton>
          </Link>
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
    </>
  )
}
