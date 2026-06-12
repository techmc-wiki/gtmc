"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { hasArticleLocale } from "@/lib/articles/locale"

const LOCALES = ["zh", "en"] as const
type Locale = (typeof LOCALES)[number]

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale() as Locale
  const t = useTranslations("CommonA11y")
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return

    const articleMatch = pathname.match(/^\/(zh|en)\/articles\/(.+)/)
    if (articleMatch) {
      const slug = articleMatch[2]
      if (!hasArticleLocale(slug, newLocale)) {
        router.replace(`/${newLocale}/articles`, { locale: newLocale })
        return
      }
    }

    router.replace(pathname, { locale: newLocale })
  }

  return (
    <div
      className={`border-tech-main/40 relative flex items-center border font-mono text-[0.625rem] tracking-[0.15em] ${className} `}>
      {LOCALES.map((loc, i) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          aria-label={t("languageSwitcher")}
          aria-pressed={locale === loc}
          className={`touch-target flex min-h-8 min-w-7 items-center justify-center px-2 py-1 uppercase transition-colors duration-200 ${i > 0 ? "border-tech-main/40 border-l" : ""} ${
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
