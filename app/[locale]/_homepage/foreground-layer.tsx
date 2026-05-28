import { GithubIcon } from "@/components/markdown/people-mention"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { TechButton } from "@/components/ui/tech-button"
import { HeroCard } from "./hero-card"
import { ForwardedRef, useCallback } from "react"
import { MotionValue } from "motion/react"

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

export function ForegroundLayer({
  cardRef,
  cardWidth,
  fgTransform,
  isAccessingDatabase,
  setIsAccessingDatabase,
}: {
  cardRef: ForwardedRef<HTMLDivElement>
  cardWidth: number
  fgTransform: {
    x: MotionValue<number>
    y: MotionValue<number>
    rotateX: MotionValue<number>
    rotateY: MotionValue<number>
  }
  isAccessingDatabase: boolean
  setIsAccessingDatabase: (v: boolean) => void
}) {
  const t = useTranslations("Homepage")

  const handleArticlesClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (isAccessingDatabase) {
        event.preventDefault()
        return
      }

      setIsAccessingDatabase(true)
    },
    [isAccessingDatabase, setIsAccessingDatabase]
  )

  return (
    <main className="relative z-10 mx-auto mt-[7vh] flex min-h-max w-full max-w-7xl flex-col items-center justify-center px-4 py-24">
      {/* Foreground Layer - Card chrome and nearby accents */}
      <HeroCard
        cardRef={cardRef}
        cardWidth={cardWidth}
        fgTransform={fgTransform}
      />

      {/* 操作入口 */}
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
            {"//"} {t("loginGithub")} <GithubIcon className="size-4" />
          </TechButton>
        </Link>
      </div>

      {/* 底部隐喻：MC典型的格子/合成槽堆叠图形列阵 */}
      <div className="pointer-events-none relative mt-12 flex space-x-1 opacity-40">
        <div className="text-tech-main/60 absolute -top-4 font-mono text-[0.5rem]">
          INVENTORY_SLOTS_
        </div>
        {INVENTORY_SLOT_KEYS.map((slotKey, i) => (
          <div
            key={slotKey}
            className={`flex size-8 items-center justify-center ${
              i === 3
                ? `border-tech-main-dark bg-tech-main/10 border-2 shadow-[0_0_8px_rgb(var(--color-tech-main)/0.3)]`
                : `border-tech-main/40 border`
            } `}>
            {i === 3 && (
              <div className="bg-tech-main-dark/80 size-4 rotate-45" />
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
