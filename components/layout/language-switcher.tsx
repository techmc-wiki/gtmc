"use client"

import { useCallback } from "react"
import { useLocale, useTranslations } from "next-intl"
import { GlobeIcon, CheckIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu"
import { useRouter, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/cn"

const LOCALES = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
] as const

type Locale = (typeof LOCALES)[number]["value"]

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("languageSwitcher")}
          title={t("languageSwitcher")}
          className={cn(
            "hover:bg-tech-main/10 hover:text-tech-main-dark hover:no-underline md:size-10",
            className
          )}>
          <GlobeIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="border-tech-main/30 bg-surface-overlay/95 w-40 border p-1 shadow-lg backdrop-blur-sm">
        {LOCALES.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onSelect={() => switchLocale(item.value)}
            className="text-tech-main-dark focus:bg-tech-main/10 focus:text-tech-main-dark cursor-pointer gap-2 rounded-none">
            <span className="flex-1">{item.label}</span>
            {locale === item.value && (
              <CheckIcon className="text-tech-signal size-3.5 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
