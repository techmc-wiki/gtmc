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
  const [activeLetter, setActiveLetter] = React.useState<string | null>(null)

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

  return (
    <nav
      role="navigation"
      aria-label={t("letterBarLabel")}
      className={cn(
        "border-tech-line/30 sticky top-0 z-10 border-b bg-white/85 backdrop-blur-sm",
        className
      )}>
      <div className="relative">
        <CornerBrackets color="border-tech-main/30" size="size-2" />
        <ul
          className="flex items-stretch overflow-x-auto"
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
      </div>
    </nav>
  )
}
