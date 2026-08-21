"use client"

import { useCallback } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/shadcn/toggle-group"
import { useRouter, usePathname } from "@/i18n/navigation"

const LOCALES = ["zh", "en"] as const
type Locale = (typeof LOCALES)[number]

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as Locale
  const t = useTranslations("CommonA11y")
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = useCallback(
    (newLocale: Locale) => {
      if (newLocale === locale) return

      router.replace(pathname, { locale: newLocale })
    },
    [locale, pathname, router]
  )

  return (
    <ToggleGroup
      type="single"
      value={locale}
      onValueChange={(value) => {
        if (value) switchLocale(value as Locale)
      }}
      aria-label={t("languageSwitcher")}
      variant="tech"
      size="sm"
      className={`border-tech-main/40 h-8 gap-0 border font-mono text-[0.625rem] tracking-[0.15em] md:h-10 ${className}`}>
      {LOCALES.map((loc) => (
        <ToggleGroupItem
          key={loc}
          value={loc}
          className="h-full rounded-none text-[0.625rem] tracking-[0.15em]">
          {loc === "en" ? "Eng" : "中文"}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
