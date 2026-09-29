"use client"

import { Fragment, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"

import { QqIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/shadcn/button"
import { Separator } from "@/components/ui/shadcn/separator"

// Four degrees keeps the edge tilt perceptible without making the card feel loose.
const TILT_MAX_DEG = 4

/** Keep sentence case in the DOM; CSS uppercases it without spelling it out for screen readers. */
const BOOK_CATEGORIES = ["Tutorials", "Explanations", "Code analysis"] as const

export function HeroCard() {
  const t = useTranslations("Homepage")
  const tiltRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        event.pointerType !== "mouse" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return
      }
      const wrapper = tiltRef.current
      const card = cardRef.current
      if (!wrapper || !card) return
      const rect = wrapper.getBoundingClientRect()
      const px = Math.min(
        1,
        Math.max(0, (event.clientX - rect.left) / rect.width)
      )
      const py = Math.min(
        1,
        Math.max(0, (event.clientY - rect.top) / rect.height)
      )
      wrapper.classList.add("is-hover")
      card.classList.add("is-tilting")
      card.style.setProperty(
        "--tilt-ry",
        ((px - 0.5) * TILT_MAX_DEG).toFixed(2) + "deg"
      )
      card.style.setProperty(
        "--tilt-rx",
        ((0.5 - py) * TILT_MAX_DEG).toFixed(2) + "deg"
      )
      card.style.setProperty("--tilt-gx", (px * 100).toFixed(1) + "%")
      card.style.setProperty("--tilt-gy", (py * 100).toFixed(1) + "%")
    },
    []
  )

  const onPointerLeave = useCallback(() => {
    const wrapper = tiltRef.current
    const card = cardRef.current
    if (!wrapper || !card) return
    wrapper.classList.remove("is-hover")
    card.classList.remove("is-tilting")
    card.style.setProperty("--tilt-rx", "0deg")
    card.style.setProperty("--tilt-ry", "0deg")
  }, [])

  return (
    <div className="relative mb-8 w-full max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
      <div
        ref={tiltRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="t-tilt">
        <div
          ref={cardRef}
          className="t-tilt-card border-tech-main-dark/80 bg-surface relative border shadow-[0_8px_24px_-6px_rgba(32,40,60,0.16)]">
          <div className="bg-tech-signal text-tech-signal-ink relative flex items-center justify-between px-6 py-3 sm:px-10 sm:py-4">
            <span className="font-mono text-[0.625rem] font-bold tracking-[0.25em] uppercase sm:text-xs">
              Open Access
            </span>
            <span className="hidden font-mono text-[0.625rem] font-bold sm:block sm:text-xs">
              {process.env.NEXT_PUBLIC_APP_VERSION}
            </span>
          </div>

          <div className="relative p-6 sm:p-10 md:p-12">
            <div className="t-stagger is-shown">
              <h1
                aria-label="Graduate Texts in Minecraft"
                className="text-tech-main-dark relative mb-6 flex flex-col items-start text-4xl tracking-tight sm:mb-8 sm:gap-1 sm:text-6xl lg:text-7xl">
                <span
                  aria-hidden="true"
                  className="t-stagger-line t-stagger-line--1 display-title">
                  Graduate Texts
                </span>
                <span
                  aria-hidden="true"
                  className="t-stagger-line t-stagger-line--2">
                  <span className="display-title text-tech-main flex flex-row items-baseline gap-3 sm:gap-5">
                    in Minecraft
                    <span
                      aria-hidden="true"
                      className="bg-tech-signal inline-block h-[0.7em] w-[0.45ch] animate-pulse self-center motion-reduce:animate-none"
                    />
                  </span>
                </span>
              </h1>

              <div className="t-stagger-line t-stagger-line--3 border-tech-signal flex max-w-xl flex-col gap-2 border-l-[3px] pl-3 sm:gap-4 sm:pl-5">
                <span className="text-tech-main-dark/85 text-xs/relaxed sm:text-base/relaxed">
                  {t("slogan")}
                </span>

                <div className="text-tech-main flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tracking-wider uppercase sm:text-sm">
                  {BOOK_CATEGORIES.map((category, index) => (
                    <Fragment key={category}>
                      {index > 0 && (
                        <Separator
                          orientation="vertical"
                          className="bg-tech-main/30 h-3"
                        />
                      )}
                      <span>{category}</span>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="mt-4 self-start sm:mt-6">
              <a
                href="https://qm.qq.com/q/IIaL1EnBuY"
                target="_blank"
                rel="noopener noreferrer">
                <QqIcon className="size-4" />
                {t("joinQqGroup")}
              </a>
            </Button>
          </div>
          <div aria-hidden="true" className="t-tilt-glare" />
        </div>
      </div>
    </div>
  )
}
