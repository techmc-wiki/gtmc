"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import {
  LANGUAGE_CODES,
  LANGUAGE_DISPLAY,
  isGlossaryLocale,
} from "@/lib/glossary/locales"
import type {
  GlossaryLocale,
  GlossaryTranslation,
} from "@/lib/glossary/manifest"

interface TranslationsListProps {
  translations: Partial<Record<GlossaryLocale, GlossaryTranslation>>
  activeLocale: string
}

export function TranslationsList({
  translations,
  activeLocale,
}: TranslationsListProps) {
  const t = useTranslations("Glossary")

  const availableLocales = LANGUAGE_CODES.filter((code) => {
    const entry = translations[code]
    return entry && entry.value.trim().length > 0
  })

  if (availableLocales.length === 0) {
    return (
      <p className="text-tech-main/60 font-mono text-xs tracking-widest uppercase">
        {t("detailNoTranslation")}
      </p>
    )
  }

  const activeGlossaryLocale: GlossaryLocale | null = isGlossaryLocale(
    activeLocale
  )
    ? activeLocale
    : null

  return (
    <ul className="flex flex-col gap-2">
      {availableLocales.map((code) => {
        const translation = translations[code]
        if (!translation) return null

        const isActive = activeGlossaryLocale === code
        const displayName = LANGUAGE_DISPLAY[code]

        return (
          <li key={code} className="border-tech-line/30 border">
            <details className="group" open={isActive}>
              <summary className="hover:bg-tech-main/5 flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 transition-colors [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <span className="text-tech-main/50 font-mono text-[0.625rem] tracking-widest uppercase">
                    {code.toUpperCase()}
                  </span>
                  <span className="text-tech-main-dark font-mono text-sm">
                    {displayName}
                  </span>
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 12 12"
                  className="text-tech-main/60 size-3 shrink-0 transition-transform duration-200 group-open:rotate-90">
                  <path
                    d="M4 2 L8 6 L4 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="square"
                  />
                </svg>
              </summary>
              <div className="border-tech-line/20 flex flex-col gap-2 border-t px-3 py-3">
                <p
                  className="text-tech-main-dark font-mono text-sm wrap-break-word"
                  lang={code}>
                  {translation.value}
                </p>
                {translation.description.trim().length > 0 && (
                  <p
                    className="text-tech-main/70 text-sm/relaxed wrap-break-word"
                    lang={code}>
                    {translation.description}
                  </p>
                )}
              </div>
            </details>
          </li>
        )
      })}
    </ul>
  )
}
