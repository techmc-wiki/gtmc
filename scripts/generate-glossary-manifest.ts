import fs from "fs"
import path from "path"

import { parseGlossaryCsv } from "@/lib/glossary/csv"
import type {
  GlossaryEntry,
  GlossaryLocale,
  GlossarySummaryEntry,
} from "@/lib/glossary/manifest"
import { createLogger } from "./lib/logger"

const logger = createLogger("glossary")

const CSV_FILE = path.join(process.cwd(), "glossary", "TechMC Glossary.csv")
const OUTPUT_FILE = path.join(process.cwd(), "data", "glossary.json")
const SUMMARY_FILE = path.join(process.cwd(), "data", "glossary-summary.json")

const LOCALE_COLUMNS: Array<{
  locale: GlossaryLocale
  termCol: string
  descCol: string
}> = [
  { locale: "ar", termCol: "Arabic", descCol: "Description (Arabic)" },
  { locale: "zh", termCol: "Chinese", descCol: "Description (Chinese)" },
  { locale: "fr", termCol: "French", descCol: "Description (French)" },
  { locale: "de", termCol: "German", descCol: "Description (German)" },
  { locale: "it", termCol: "Italian", descCol: "Description (Italian)" },
  { locale: "ja", termCol: "Japanese", descCol: "Description (Japanese)" },
  { locale: "ko", termCol: "Korean", descCol: "Description (Korean)" },
  { locale: "pt", termCol: "Portugese", descCol: "Description (Portugese)" },
  { locale: "ru", termCol: "Russian", descCol: "Description (Russian)" },
  { locale: "es", termCol: "Spanish", descCol: "Description (Spanish)" },
]

function generateSlug(
  fullFormEn: string,
  slugCounts: Map<string, number>
): string {
  let slug = fullFormEn
    .replace(/\*+$/, "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-{2,}/g, "-")
    .replaceAll(/^-+|-+$/g, "")
  if (!slug) slug = "term"
  const count = slugCounts.get(slug) ?? 0
  slugCounts.set(slug, count + 1)
  return count === 0 ? slug : `${slug}-${count + 1}`
}

function writeJson(filePath: string, data: unknown): void {
  const outputDir = path.dirname(filePath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n")
}

function main(): void {
  if (!fs.existsSync(CSV_FILE)) {
    logger.error("glossary.source.unavailable", { path: CSV_FILE })
    process.exit(1)
  }

  let csvText: string
  try {
    csvText = fs.readFileSync(CSV_FILE, "utf-8")
  } catch (error) {
    logger.error("glossary.source.read-failed", {}, String(error))
    process.exit(1)
  }

  let rows
  try {
    ;({ rows } = parseGlossaryCsv(csvText))
  } catch (error) {
    logger.error("glossary.source.parse-failed", {}, String(error))
    process.exit(1)
  }

  const slugCounts = new Map<string, number>()
  const entries: GlossaryEntry[] = []
  const summaries: GlossarySummaryEntry[] = []

  for (const row of rows) {
    const fullFormEn = row["Full Form (English)"]
    const rawDescription = row["Description"]
    const isControversial = rawDescription.endsWith("*")
    const description = isControversial
      ? rawDescription.slice(0, -1)
      : rawDescription

    const slug = generateSlug(fullFormEn, slugCounts)

    const translations: GlossaryEntry["translations"] = {}
    for (const { locale, termCol, descCol } of LOCALE_COLUMNS) {
      const termValue = row[termCol as keyof typeof row]
      if (termValue) {
        translations[locale] = {
          value: termValue,
          description: row[descCol as keyof typeof row],
        }
      }
    }

    entries.push({
      slug,
      fullFormEn,
      shortForm: row["Short Form"],
      category: row["Category"],
      regex: row["Regex"],
      description,
      related: row["Related"],
      isControversial,
      translations,
    })

    summaries.push({
      slug,
      fullFormEn,
      shortForm: row["Short Form"],
      category: row["Category"],
    })
  }

  try {
    writeJson(OUTPUT_FILE, entries)
    writeJson(SUMMARY_FILE, summaries)
  } catch (error) {
    logger.error("glossary.output.write-failed", {}, String(error))
    process.exit(1)
  }

  const controversial = entries.filter((e) => e.isControversial).length
  const withTranslations = entries.filter(
    (e) => Object.keys(e.translations).length > 0
  ).length

  logger.event("glossary.generated", {
    controversial_count: controversial,
    entry_count: entries.length,
    output: path.relative(process.cwd(), OUTPUT_FILE),
    translated_count: withTranslations,
  })
}

main()
