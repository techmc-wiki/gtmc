"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"

const LOCALES = ["zh", "en"] as const
type Locale = (typeof LOCALES)[number]

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <div
      className="
        relative flex items-center border border-tech-main/40
        font-mono text-[0.625rem] tracking-[0.15em]
      ">
      {LOCALES.map((loc, i) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          aria-label={`Switch to ${loc === "zh" ? "Chinese" : "English"}`}
          aria-pressed={locale === loc}
          className={`
            flex touch-target min-h-8 min-w-7 items-center
            justify-center px-2 py-1 uppercase transition-colors duration-200
            ${i > 0 ? "border-l border-tech-main/40" : ""}
            ${locale === loc
              ? "bg-tech-main text-white"
              : "bg-transparent text-tech-main hover:bg-tech-accent/30"
            }
          `}>
          {`${loc === "en" ? "Eng" : "中文"}`}
        </button>
      ))}
    </div>
  )
}
