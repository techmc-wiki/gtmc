"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/cn"

export interface GlossaryFloatingActionsProps {
  locale: "en" | "zh"
  threshold?: number
}

const FAB_BASE =
  "border-tech-main/40 text-tech-main bg-surface-overlay/80 inline-flex h-9 w-24 items-center justify-center border px-2 font-mono text-[0.6875rem] tracking-widest uppercase backdrop-blur-sm transition-colors duration-200 motion-reduce:transition-none hover:bg-tech-main/10 hover:border-tech-main/60 focus-visible:outline-tech-main focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"

export function GlossaryFloatingActions({
  locale,
  threshold = 400,
}: GlossaryFloatingActionsProps) {
  const t = useTranslations("Glossary")
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const update = () => {
      setIsVisible(window.scrollY > threshold)
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [threshold])

  const handleScrollTop = React.useCallback(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "instant" : "smooth",
    })
  }, [])

  const tabIndex = isVisible ? 0 : -1

  return (
    <div
      aria-hidden={isVisible ? "false" : "true"}
      className={cn(
        "fixed right-6 bottom-6 z-30 flex flex-col gap-3",
        "transition-opacity duration-300 motion-reduce:transition-none",
        isVisible
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      )}>
      <button
        type="button"
        onClick={handleScrollTop}
        aria-label={t("backToTop")}
        tabIndex={tabIndex}
        className={FAB_BASE}>
        [ ↑ TOP ]
      </button>
      <Link
        href="/glossary/edit/new"
        locale={locale}
        aria-label={t("editFabLabel")}
        tabIndex={tabIndex}
        className={FAB_BASE}>
        [ + EDIT ]
      </Link>
    </div>
  )
}
