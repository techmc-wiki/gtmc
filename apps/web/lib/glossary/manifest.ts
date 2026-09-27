import { cacheLife, cacheTag } from "next/cache"
import fullData from "@/data/glossary.json" with { type: "json" }
import summaryData from "@/data/glossary-summary.json" with { type: "json" }
import type { GlossaryLocale, GlossarySiteLocale } from "@/lib/glossary/locales"

export interface GlossaryLocaleIndex {
  sortKey: string
  letter: string
}

export interface GlossaryTranslation {
  value: string
  description: string
}

export interface GlossaryEntryBase {
  slug: string
  fullFormEn: string
  shortForm: string
  /** Canonical categories split from the CSV `"; "`-separated `Category` cell. */
  categories: string[]
  regex: string
  /** English description with trailing `*` stripped. */
  description: string
  /** "Related" column value as-is from the CSV (space-separated terms). */
  related: string
  /** True when the original Description field ended with `*`. */
  isControversial: boolean
  /** Per-locale translations; only locales with a non-empty term value are included. */
  translations: Partial<Record<GlossaryLocale, GlossaryTranslation>>
}

export interface GlossaryEntry extends GlossaryEntryBase {
  /** Precomputed sort and letter-bucket metadata for each public site locale. */
  indexByLocale: Record<GlossarySiteLocale, GlossaryLocaleIndex>
}

export interface GlossarySummaryEntry {
  slug: string
  fullFormEn: string
  shortForm: string
  categories: string[]
}

const glossaryEntries = fullData as GlossaryEntry[]

let summaryCache: GlossarySummaryEntry[] | null = null

export async function loadGlossaryManifest(): Promise<{
  entries: GlossaryEntry[]
}> {
  "use cache"
  cacheLife("max")
  cacheTag("glossary-manifest")
  return { entries: glossaryEntries }
}

export function loadGlossarySummary(): GlossarySummaryEntry[] {
  if (!summaryCache) {
    summaryCache = summaryData as GlossarySummaryEntry[]
  }
  return summaryCache
}
