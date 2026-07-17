import { parseRelated, type ParsedRelatedToken } from "./related"
import type {
  GlossaryEntry,
  GlossaryEntryBase,
  GlossaryTranslation,
} from "./manifest"
import {
  normalizeGlossarySiteLocale,
  type GlossaryContentLocale,
} from "./locales"

export type GlossaryIndexEntry = GlossaryEntryBase & {
  indexLetter: string
  relatedTerms: GlossaryIndexRelatedTerm[]
}

export type GlossaryIndexRelatedTerm = ParsedRelatedToken & {
  indexLetter: string
}

type GlossaryContentSource = Pick<
  GlossaryEntryBase,
  "description" | "fullFormEn" | "translations"
>

export function getGlossaryContent(
  entry: GlossaryContentSource,
  locale: GlossaryContentLocale
): GlossaryTranslation | undefined {
  if (locale === "en") {
    return {
      value: entry.fullFormEn,
      description: entry.description,
    }
  }

  return entry.translations[locale]
}

export function getPrimaryGlossaryContent(
  entry: GlossaryContentSource,
  locale: string
): GlossaryTranslation {
  const localized = getGlossaryContent(
    entry,
    normalizeGlossarySiteLocale(locale)
  )
  return {
    value: localized?.value.trim() ? localized.value : entry.fullFormEn,
    description: localized?.description.trim()
      ? localized.description
      : entry.description,
  }
}

function compareIndexText(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function normalizeRelatedTarget(target: string): string {
  return target.trim().toLocaleLowerCase("en")
}

function fallbackRelatedIndexLetter(target: string): string {
  const first = target.trim()[0]?.toUpperCase()
  return first && first >= "A" && first <= "Z" ? first : "#"
}

export function projectGlossaryIndex(
  entries: readonly GlossaryEntry[],
  locale: string
): GlossaryIndexEntry[] {
  const primaryLocale = normalizeGlossarySiteLocale(locale)
  const entriesByEnglishTerm = new Map<string, GlossaryEntry>()

  for (const entry of entries) {
    entriesByEnglishTerm.set(normalizeRelatedTarget(entry.fullFormEn), entry)
  }

  const orderedEntries =
    primaryLocale === "zh"
      ? entries.toSorted((left, right) => {
          const primaryComparison = compareIndexText(
            left.indexByLocale.zh.sortKey,
            right.indexByLocale.zh.sortKey
          )
          if (primaryComparison !== 0) return primaryComparison

          const englishComparison = compareIndexText(
            left.indexByLocale.en.sortKey,
            right.indexByLocale.en.sortKey
          )
          if (englishComparison !== 0) return englishComparison

          return compareIndexText(left.slug, right.slug)
        })
      : entries

  return orderedEntries.map((entry) => {
    const relatedTerms = parseRelated(entry.related).map((related) => {
      const targetEntry = entriesByEnglishTerm.get(
        normalizeRelatedTarget(related.target)
      )
      return Object.assign({}, related, {
        indexLetter:
          targetEntry?.indexByLocale[primaryLocale].letter ??
          fallbackRelatedIndexLetter(related.target),
      })
    })

    const { indexByLocale, ...publicEntry } = entry

    return Object.assign(publicEntry, {
      indexLetter: indexByLocale[primaryLocale].letter,
      relatedTerms,
    })
  })
}
