"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"

const LOCALES = ["zh", "en"] as const
type Locale = (typeof LOCALES)[number]

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as Locale
  const t = useTranslations("CommonA11y")
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return

    router.replace(pathname, { locale: newLocale })
  }

  return (
    <div
      className={`border-tech-main/40 relative flex h-8 items-stretch border font-mono text-[0.625rem] tracking-[0.15em] md:h-10 ${className} `}>
      {LOCALES.map((loc, i) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          aria-label={t("languageSwitcher")}
          aria-pressed={locale === loc}
          className={`flex h-full min-w-7 cursor-pointer items-center justify-center px-2 uppercase transition-colors duration-200 ${i > 0 ? "border-tech-main/40 border-l" : ""} ${
            locale === loc
              ? "bg-tech-main-dark text-tech-bg"
              : "text-tech-main hover:bg-tech-accent/30 bg-transparent"
          } `}>
          {`${loc === "en" ? "Eng" : "中文"}`}
        </button>
      ))}
    </div>
  )
}
