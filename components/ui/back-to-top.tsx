"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/cn"

export interface BackToTopProps {
  threshold?: number
  className?: string
}

export function BackToTop({ threshold = 400, className = "" }: BackToTopProps) {
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

  const handleClick = React.useCallback(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "instant" : "smooth",
    })
  }, [])

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t("backToTop")}
      aria-hidden={isVisible ? "false" : "true"}
      tabIndex={isVisible ? 0 : -1}
      className={cn(
        "fixed right-6 bottom-6 z-30",
        "inline-flex min-h-[44px] min-w-[44px] items-center justify-center",
        "border-tech-main/40 text-tech-main bg-surface-overlay/80 border backdrop-blur-sm",
        "px-3 py-2 font-mono text-xs tracking-widest uppercase",
        "transition-opacity duration-300 motion-reduce:transition-none",
        "hover:bg-tech-main/10",
        "focus-visible:outline-tech-main focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
        isVisible
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
        className
      )}>
      [ ↑ TOP ]
    </button>
  )
}
