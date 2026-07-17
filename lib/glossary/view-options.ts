import {
  LANGUAGE_CODES,
  LANGUAGE_DISPLAY,
  isGlossaryContentLocale,
  normalizeGlossarySiteLocale,
  type GlossaryContentLocale,
  type GlossarySiteLocale,
} from "./locales"

export const GLOSSARY_DENSITIES = ["compact", "normal", "comfortable"] as const

export type GlossaryDensity = (typeof GLOSSARY_DENSITIES)[number]

export const GLOSSARY_CORE_COLUMNS = [
  "term",
  "shortForm",
  "category",
  "regex",
  "description",
  "related",
] as const

export type GlossaryCoreColumn = (typeof GLOSSARY_CORE_COLUMNS)[number]

export const GLOSSARY_DISPLAY_LOCALES = [
  "en",
  ...LANGUAGE_CODES,
] as const satisfies readonly GlossaryContentLocale[]

type GlossaryTranslationField = "term" | "description"

type GlossaryTranslationColumn =
  `translation:${GlossaryContentLocale}:${GlossaryTranslationField}`

export type GlossaryTableColumn = GlossaryCoreColumn | GlossaryTranslationColumn

interface ParsedGlossaryTranslationColumn {
  locale: GlossaryContentLocale
  field: GlossaryTranslationField
}

const DEFAULT_GLOSSARY_TABLE_COLUMNS = {
  en: ["term", "shortForm", "description", "related"],
  zh: ["term", "shortForm", "description", "translation:en:term", "related"],
} as const satisfies Record<GlossarySiteLocale, readonly GlossaryTableColumn[]>

export function getDefaultGlossaryTableColumns(
  locale: string
): GlossaryTableColumn[] {
  return normalizeGlossarySiteLocale(locale) === "zh"
    ? [...DEFAULT_GLOSSARY_TABLE_COLUMNS.zh]
    : [...DEFAULT_GLOSSARY_TABLE_COLUMNS.en]
}

export function getGlossaryDisplayName(locale: GlossaryContentLocale): string {
  return LANGUAGE_DISPLAY[locale]
}

export function createGlossaryTranslationColumn(
  locale: GlossaryContentLocale,
  field: GlossaryTranslationField
): GlossaryTranslationColumn {
  return `translation:${locale}:${field}`
}

export function parseGlossaryTranslationColumn(
  column: string
): ParsedGlossaryTranslationColumn | null {
  const [prefix, locale, field, extra] = column.split(":")
  if (prefix !== "translation" || extra !== undefined) return null
  if (!locale || !isGlossaryContentLocale(locale)) return null
  if (field !== "term" && field !== "description") return null
  return { locale, field }
}

export function isGlossaryTableColumn(
  column: unknown
): column is GlossaryTableColumn {
  if (typeof column !== "string") return false
  if ((GLOSSARY_CORE_COLUMNS as readonly string[]).includes(column)) return true
  return parseGlossaryTranslationColumn(column) !== null
}
