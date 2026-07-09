import fs from "fs"
import https from "https"
import path from "path"
import { fileURLToPath } from "url"

import { parseGlossaryCsv } from "@/lib/glossary/csv"
import type {
  GlossaryEntry,
  GlossaryLocale,
  GlossarySummaryEntry,
} from "@/lib/glossary/manifest"

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const CSV_FILE = path.join(PROJECT_ROOT, "glossary", "TechMC Glossary.csv")
const CSV_URL = new URL(
  "https://raw.githubusercontent.com/TechMC-Glossary/TechMC-Glossary/main/TechMC%20Glossary.csv"
)
const FETCH_ATTEMPTS = 3
const FETCH_TIMEOUT_MS = 20_000
const OUTPUT_FILE = path.join(PROJECT_ROOT, "data", "glossary.json")
const SUMMARY_FILE = path.join(PROJECT_ROOT, "data", "glossary-summary.json")

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

function fetchTextOnce(url: URL): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode ?? "unknown"}`))
          response.resume()
          return
        }

        response.setEncoding("utf8")
        let body = ""
        response.on("data", (chunk: string) => {
          body += chunk
        })
        response.on("end", () => {
          resolve(body)
        })
      })
      .on("error", reject)

    request.setTimeout(FETCH_TIMEOUT_MS, () => {
      request.destroy(new Error(`timeout after ${FETCH_TIMEOUT_MS}ms`))
    })
  })
}

async function fetchText(url: URL, attempt = 1): Promise<string> {
  try {
    return await fetchTextOnce(url)
  } catch (error) {
    const lastError = error instanceof Error ? error : new Error(String(error))
    process.stderr.write(
      `Warning: CSV fetch attempt ${attempt}/${FETCH_ATTEMPTS} failed: ${lastError.message}\n`
    )
    if (attempt >= FETCH_ATTEMPTS) {
      throw lastError
    }

    return fetchText(url, attempt + 1)
  }
}

async function readCsvText(): Promise<{ source: string; text: string }> {
  if (fs.existsSync(CSV_FILE)) {
    return {
      source: path.relative(PROJECT_ROOT, CSV_FILE),
      text: fs.readFileSync(CSV_FILE, "utf-8"),
    }
  }

  process.stderr.write(
    `Warning: CSV file not found at ${CSV_FILE}; fetching ${CSV_URL.href}\n`
  )
  return { source: CSV_URL.href, text: await fetchText(CSV_URL) }
}

async function main(): Promise<void> {
  let csvText: string
  let source: string
  try {
    ;({ source, text: csvText } = await readCsvText())
  } catch (error) {
    process.stderr.write(
      `Error: Failed to load CSV: ${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exit(1)
  }

  let rows
  try {
    ;({ rows } = parseGlossaryCsv(csvText))
  } catch (error) {
    process.stderr.write(
      `Error: Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}\n`
    )
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
    process.stderr.write(
      `Error: Failed to write output: ${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exit(1)
  }

  const controversial = entries.filter((e) => e.isControversial).length
  const withTranslations = entries.filter(
    (e) => Object.keys(e.translations).length > 0
  ).length

  process.stdout.write(
    [
      "[glossary-manifest] Glossary manifest generated",
      `Source: ${source}`,
      `Output: ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`,
      `        ${path.relative(PROJECT_ROOT, SUMMARY_FILE)}`,
      `Entries: ${entries.length} total (${controversial} controversial, ${withTranslations} with translations)`,
      "",
    ].join("\n")
  )
}

void main()
