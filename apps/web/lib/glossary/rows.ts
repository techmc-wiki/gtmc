import { GLOSSARY_COLUMNS, type GlossaryRow } from "@/lib/glossary/csv"
import { LOCALE_TO_COLUMN, type GlossaryLocale } from "@/lib/glossary/locales"
import type { GlossaryEntry } from "@/lib/glossary/manifest"

/** A blank editable row with every CSV column present. */
export function emptyGlossaryRow(): GlossaryRow {
  const row = {} as GlossaryRow
  for (const col of GLOSSARY_COLUMNS) {
    row[col] = ""
  }
  return row
}

/** Project a manifest entry into the editable CSV row the editor works with. */
export function glossaryEntryToRow(entry: GlossaryEntry): GlossaryRow {
  const row = emptyGlossaryRow()
  row["Full Form (English)"] = entry.fullFormEn
  row["Short Form"] = entry.shortForm
  row["Category"] = entry.categories.join("; ")
  row["Regex"] = entry.regex
  row["Description"] = entry.isControversial ? `${entry.description}*` : entry.description
  row["Related"] = entry.related

  for (const code of Object.keys(LOCALE_TO_COLUMN) as GlossaryLocale[]) {
    const translation = entry.translations[code]
    if (translation) {
      const { termColumn, descColumn } = LOCALE_TO_COLUMN[code]
      row[termColumn as keyof GlossaryRow] = translation.value
      row[descColumn as keyof GlossaryRow] = translation.description
    }
  }
  return row
}

export interface GlossaryDanglingRef {
  slug: string
  fullFormEn: string
}

/** Entries whose `Related` list still points at the term being deleted. */
export function findDanglingGlossaryRefs(
  slug: string,
  fullFormEn: string,
  entries: GlossaryEntry[],
): GlossaryDanglingRef[] {
  const fullFormLower = fullFormEn.trim().toLowerCase()
  const found: GlossaryDanglingRef[] = []
  for (const entry of entries) {
    if (entry.slug === slug) continue
    if (!entry.related) continue
    const tokens = new Set(
      entry.related
        .split(/\s+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean),
    )
    if (tokens.has(slug) || (fullFormLower && tokens.has(fullFormLower))) {
      found.push({ slug: entry.slug, fullFormEn: entry.fullFormEn })
    }
  }
  return found
}
