import fs from "fs"
import path from "path"
import { customPinyin, pinyin } from "pinyin-pro"

import { parseGlossaryCsv } from "@/lib/glossary/csv"
import type {
  GlossaryEntry,
  GlossaryLocaleIndex,
  GlossarySummaryEntry,
} from "@/lib/glossary/manifest"
import { LANGUAGE_CODES, LOCALE_TO_COLUMN } from "@/lib/glossary/locales"
import { generateUniqueSlug } from "@/lib/glossary/slug"
import { createLogger } from "./lib/logger"

const logger = createLogger("glossary")

const CSV_FILE = path.join(process.cwd(), "glossary", "TechMC Glossary.csv")
const OUTPUT_FILE = path.join(process.cwd(), "data", "glossary.json")
const SUMMARY_FILE = path.join(process.cwd(), "data", "glossary-summary.json")

const HAN_CHARACTER = /\p{Script=Han}/u
const ASCII_INDEX_CHARACTER = /[^a-z0-9]+/g
const DOMAIN_PINYIN = { 重载: "chong zai" }

// Technical terms whose domain pronunciation differs from the library default.
customPinyin(DOMAIN_PINYIN)

function normalizeIndexSortKey(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/\p{Mark}/gu, "")
    .toLocaleLowerCase("en")
    .replaceAll(ASCII_INDEX_CHARACTER, " ")
    .trim()
}

function createIndexRecord(value: string): GlossaryLocaleIndex {
  const sortKey = normalizeIndexSortKey(value)
  const first = sortKey[0]?.toUpperCase()

  return {
    sortKey,
    letter: first && first >= "A" && first <= "Z" ? first : "#",
  }
}

function createEntryIndex(
  fullFormEn: string,
  chinese: string | undefined
): GlossaryEntry["indexByLocale"] {
  const english = createIndexRecord(fullFormEn)

  if (!chinese || !HAN_CHARACTER.test(chinese)) {
    return { en: english, zh: english }
  }

  const chinesePinyin = pinyin(chinese, {
    toneType: "none",
    nonZh: "consecutive",
  })
  const chineseIndex = createIndexRecord(chinesePinyin)

  return {
    en: english,
    zh: chineseIndex.sortKey ? chineseIndex : english,
  }
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

  const usedSlugs = new Set<string>()
  const entries: GlossaryEntry[] = []
  const summaries: GlossarySummaryEntry[] = []

  for (const row of rows) {
    const fullFormEn = row["Full Form (English)"]
    const rawDescription = row["Description"]
    const isControversial = rawDescription.endsWith("*")
    const description = isControversial
      ? rawDescription.slice(0, -1)
      : rawDescription

    const slug = generateUniqueSlug(fullFormEn, usedSlugs)

    const translations: GlossaryEntry["translations"] = {}
    for (const locale of LANGUAGE_CODES) {
      const { termColumn, descColumn } = LOCALE_TO_COLUMN[locale]
      const termValue = row[termColumn]
      if (termValue) {
        translations[locale] = {
          value: termValue,
          description: row[descColumn],
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
      indexByLocale: createEntryIndex(fullFormEn, translations.zh?.value),
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
