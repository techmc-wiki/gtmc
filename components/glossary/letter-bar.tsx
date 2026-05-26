"use client"

import * as React from "react"

import { useTranslations } from "next-intl"

import { CornerBrackets } from "@/components/ui/corner-brackets"
import { cn } from "@/lib/cn"

const ALL_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "#",
] as const

const LETTER_ID_PREFIX = "letter-"

export interface LetterBarProps {
  /**
   * Letters that have at least one matching glossary entry.
   * Letters outside this set render disabled (grayed-out, non-clickable).
   * Use `"#"` for the non-alphabetic bucket.
   */
  availableLetters: string[]
  className?: string
}

export function LetterBar({ availableLetters, className }: LetterBarProps) {
  const t = useTranslations("Glossary")
  const scrollRef = React.useRef<HTMLUListElement>(null)
  const [activeLetter, setActiveLetter] = React.useState<string | null>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const availableSet = React.useMemo(
    () =>
      new Set(availableLetters.map((letter) => letter.trim().toUpperCase())),
    [availableLetters]
  )

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (typeof IntersectionObserver === "undefined") return

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(`[id^="${LETTER_ID_PREFIX}"]`)
    )
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // The section closest to the top trigger band is the active one.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const topEntry = visible[0]
        if (!topEntry) return
        const id = topEntry.target.id
        const letter = id.slice(LETTER_ID_PREFIX.length).toUpperCase()
        setActiveLetter(letter)
      },
      {
        // Trigger band sits just below the sticky bar; ignore the
        // bottom 80% of the viewport so only the top section wins.
        rootMargin: "-10% 0px -80% 0px",
        threshold: 0,
      }
    )

    for (const section of sections) {
      observer.observe(section)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 0)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }

    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)

    return () => {
      el.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [availableLetters])

  return (
    <nav
      role="navigation"
      aria-label={t("letterBarLabel")}
      className={cn(
        "border-tech-line/30 sticky top-18 z-20 border-b bg-white/85 backdrop-blur-sm md:top-22",
        className
      )}>
      <div className="relative">
        <CornerBrackets color="border-tech-main/30" size="size-2" />
        <ul
          ref={scrollRef}
          className="custom-bottom-scrollbar flex items-stretch overflow-x-auto [-webkit-overflow-scrolling:touch]"
          style={{ WebkitOverflowScrolling: "touch" }}>
          {ALL_LETTERS.map((letter) => {
            const isAvailable = availableSet.has(letter)
            const isActive = activeLetter === letter

            return (
              <li key={letter} className="shrink-0">
                <button
                  type="button"
                  data-letter={letter}
                  aria-current={isActive ? "true" : undefined}
                  aria-disabled={!isAvailable || undefined}
                  onClick={(event) => {
                    if (!isAvailable) {
                      event.preventDefault()
                      return
                    }
                    const target = document.getElementById(
                      `${LETTER_ID_PREFIX}${letter}`
                    )
                    if (target) {
                      target.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                      setActiveLetter(letter)
                    }
                  }}
                  className={cn(
                    "flex h-9 min-w-9 items-center justify-center border-l-2 px-2 font-mono text-xs tracking-[0.18em] transition-colors duration-200 select-none",
                    "focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2",
                    isActive &&
                      "border-tech-main bg-tech-main/10 text-tech-main-dark font-bold",
                    !isActive &&
                      isAvailable &&
                      "text-tech-main hover:bg-tech-main/5 cursor-pointer border-transparent",
                    !isAvailable &&
                      "text-tech-main cursor-default border-transparent opacity-30"
                  )}>
                  {letter}
                </button>
              </li>
            )
          })}
        </ul>
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-white/90 via-white/60 to-transparent transition-opacity duration-200",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-white/80 to-transparent transition-opacity duration-200",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "text-tech-main/60 pointer-events-none absolute top-1/2 right-2 z-10 flex size-6 -translate-y-1/2 items-center justify-center transition-opacity duration-200",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}>
          <span className="size-2 rotate-45 border-t border-r border-current" />
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "text-tech-main/50 pointer-events-none absolute top-1/2 left-2 z-10 flex size-6 -translate-y-1/2 items-center justify-center transition-opacity duration-200",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}>
          <span className="size-2 -rotate-[135deg] border-t border-r border-current" />
        </span>
      </div>
    </nav>
  )
}
