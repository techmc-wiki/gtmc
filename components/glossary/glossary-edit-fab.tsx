"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/cn"

export interface GlossaryEditFabProps {
  locale: "en" | "zh"
  className?: string
}

export function GlossaryEditFab({ locale, className }: GlossaryEditFabProps) {
  const t = useTranslations("Glossary")

  return (
    <Link
      href="/glossary/edit/new"
      locale={locale}
      aria-label={t("editFabLabel")}
      className={cn(
        "fixed right-6 bottom-6 z-30",
        "inline-flex min-h-[44px] min-w-[44px] items-center justify-center",
        "border-tech-main/40 text-tech-main bg-surface-overlay/80 border backdrop-blur-sm",
        "px-3 py-2 font-mono text-xs tracking-widest uppercase",
        "transition-colors duration-200 motion-reduce:transition-none",
        "hover:bg-tech-main/10 hover:border-tech-main/60",
        "focus-visible:outline-tech-main focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
        className
      )}>
      [ + EDIT ]
    </Link>
  )
}
