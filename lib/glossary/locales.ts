import type { GlossaryLocale } from "./manifest"

export const LOCALE_TO_COLUMN: Record<
  GlossaryLocale,
  { termColumn: string; descColumn: string }
> = {
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
}

const NEXT_INTL_TO_GLOSSARY: Record<string, GlossaryLocale> = {
  ar: "ar",
  zh: "zh",
  fr: "fr",
  de: "de",
  it: "it",
  ja: "ja",
  ko: "ko",
  pt: "pt",
  ru: "ru",
  es: "es",
}

export function isGlossaryLocale(locale: string): locale is GlossaryLocale {
  return locale in NEXT_INTL_TO_GLOSSARY
}

export const LANGUAGE_CODES: GlossaryLocale[] = [
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
]

export const LANGUAGE_DISPLAY: Record<GlossaryLocale, string> = {
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
