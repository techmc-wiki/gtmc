"use client"

import { useCallback, useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { SegmentedControl } from "@/components/ui/segmented-control"
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

  const options = useMemo(
    () =>
      LOCALES.map((loc) => ({
        value: loc,
        label: loc === "en" ? "Eng" : "中文",
      })),
    []
  )

  return (
    <SegmentedControl
      ariaLabel={t("languageSwitcher")}
      className={`border-tech-main/40 h-8 gap-0 border font-mono text-[0.625rem] tracking-[0.15em] md:h-10 ${className}`}
      onValueChange={switchLocale}
      options={options}
      size="sm"
      value={locale}
    />
  )
}
