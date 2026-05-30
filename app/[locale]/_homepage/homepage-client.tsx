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
import { GithubIcon } from "@/components/markdown/people-mention"

const INVENTORY_SLOT_KEYS = [
  "slot-0",
  "slot-1",
  "slot-2",
  "slot-3",
  "slot-4",
  "slot-5",
  "slot-6",
  "slot-7",
  "slot-8",
] as const

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

      <main className="relative z-10 mx-auto mt-[7vh] flex min-h-max w-full max-w-7xl flex-col items-center justify-center px-4 py-24">
        <HeroCard
          cardRef={cardRef}
          cardWidth={cardWidth}
          fgTransform={fgTransform}
        />

        <div className="animate-slide-up-fade fill-mode-forwards relative z-20 flex w-full max-w-48 flex-col items-stretch justify-center gap-5 opacity-0 [animation-delay:1.4s] motion-reduce:animate-none motion-reduce:opacity-100 sm:w-full sm:max-w-full sm:flex-row sm:items-center">
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
          <Link href="/login" className="w-full sm:w-72">
            <TechButton
              variant="secondary"
              className="flex h-12 w-full items-center justify-center text-xs font-medium tracking-widest uppercase shadow-sm backdrop-blur-md transition-transform duration-300 hover:scale-102 sm:text-sm">
              {"// "}
              {t("loginGithub")} <GithubIcon className="size-4" />
            </TechButton>
          </Link>
        </div>

        <div className="pointer-events-none relative mt-12 flex space-x-1 opacity-40">
          <div className="text-tech-main/60 absolute -top-4 font-mono text-[0.5rem]">
            INVENTORY_SLOTS_
          </div>
          {INVENTORY_SLOT_KEYS.map((slotKey, i) => (
            <div
              key={slotKey}
              className={`flex size-8 items-center justify-center ${
                i === 3
                  ? `border-tech-main-dark bg-tech-main/10 border-2 shadow-[0_0_8px_rgba(96,112,143,0.3)]`
                  : `border-tech-main/40 border`
              } `}>
              {i === 3 && (
                <div className="bg-tech-main-dark/80 size-4 rotate-45" />
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
