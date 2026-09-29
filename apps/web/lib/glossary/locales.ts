import type { GlossaryColumn } from "./csv"

export type GlossaryLocale =
  | "ar"
  | "zh"
  | "fr"
  | "de"
  | "it"
  | "ja"
  | "ko"
  | "pt"
  | "ru"
  | "es"

export type GlossarySiteLocale = "en" | "zh"
export type GlossaryContentLocale = "en" | GlossaryLocale

interface GlossaryLocaleColumns {
  termColumn: GlossaryColumn
  descColumn: GlossaryColumn
}

export const LOCALE_TO_COLUMN = {
  ar: { termColumn: "Arabic", descColumn: "Description (Arabic)" },
  zh: { termColumn: "Chinese", descColumn: "Description (Chinese)" },
  fr: { termColumn: "French", descColumn: "Description (French)" },
  de: { termColumn: "German", descColumn: "Description (German)" },
  it: { termColumn: "Italian", descColumn: "Description (Italian)" },
  ja: { termColumn: "Japanese", descColumn: "Description (Japanese)" },
  ko: { termColumn: "Korean", descColumn: "Description (Korean)" },
  pt: { termColumn: "Portugese", descColumn: "Description (Portugese)" },
  ru: { termColumn: "Russian", descColumn: "Description (Russian)" },
  es: { termColumn: "Spanish", descColumn: "Description (Spanish)" },
} as const satisfies Record<GlossaryLocale, GlossaryLocaleColumns>

export const LANGUAGE_CODES = [
  "ar",
  "zh",
  "fr",
  "de",
  "it",
  "ja",
  "ko",
  "pt",
  "ru",
  "es",
] as const satisfies readonly GlossaryLocale[]

const GLOSSARY_LOCALES: ReadonlySet<string> = new Set(LANGUAGE_CODES)

export function isGlossaryLocale(locale: string): locale is GlossaryLocale {
  return GLOSSARY_LOCALES.has(locale)
}

export function isGlossaryContentLocale(
  locale: string
): locale is GlossaryContentLocale {
  return locale === "en" || isGlossaryLocale(locale)
}

export function normalizeGlossarySiteLocale(
  locale: string
): GlossarySiteLocale {
  const language = locale.trim().toLocaleLowerCase("en").split(/[-_]/, 1)[0]
  return language === "zh" ? "zh" : "en"
}

export const LANGUAGE_DISPLAY: Record<GlossaryContentLocale, string> = {
  en: "English",
  ar: "العربية",
  zh: "中文",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  pt: "Português",
  ru: "Русский",
  es: "Español",
}
