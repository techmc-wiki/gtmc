import Papa from "papaparse"

/**
 * The 26 column names from the glossary CSV header, in order.
 * "Portugese" is intentionally misspelled (matches the source CSV).
 */
export const GLOSSARY_COLUMNS = [
  "Category",
  "Short Form",
  "Regex",
  "Full Form (English)",
  "Related",
  "Description",
  "Arabic",
  "Description (Arabic)",
  "Chinese",
  "Description (Chinese)",
  "French",
  "Description (French)",
  "German",
  "Description (German)",
  "Italian",
  "Description (Italian)",
  "Japanese",
  "Description (Japanese)",
  "Korean",
  "Description (Korean)",
  "Portugese",
  "Description (Portugese)",
  "Russian",
  "Description (Russian)",
  "Spanish",
  "Description (Spanish)",
] as const

export type GlossaryColumn = (typeof GLOSSARY_COLUMNS)[number]

export type GlossaryRow = Record<GlossaryColumn, string>

export interface ParseGlossaryResult {
  rows: GlossaryRow[]
  headerOrder: GlossaryColumn[]
  hadBom: boolean
  lineEnding: "\n" | "\r\n"
}

export interface SerializeGlossaryOptions {
  headerOrder: GlossaryColumn[]
  hadBom: boolean
  lineEnding: "\n" | "\r\n"
}

const BOM = "\ufeff"

/**
 * Parse glossary CSV text into structured rows.
 *
 * Validates that the header matches the expected 26 columns exactly.
 * Returns header order (as detected from the CSV), BOM presence, and line ending.
 */
export function parseGlossaryCsv(input: string): ParseGlossaryResult {
  const hadBom = input.startsWith(BOM)
  const content = hadBom ? input.slice(1) : input

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  if (result.errors.length > 0) {
    const firstErr = result.errors[0]
    throw new Error(
      `CSV parse error at row ${firstErr.row ?? "?"}: ${firstErr.message}`
    )
  }

  const detectedFields = result.meta.fields ?? []
  const headerOrder = detectedFields as GlossaryColumn[]

  const expectedSet = new Set(GLOSSARY_COLUMNS)
  const detectedSet = new Set(detectedFields)

  if (detectedSet.size !== expectedSet.size) {
    throw new Error(
      `Header column count mismatch: expected ${GLOSSARY_COLUMNS.length}, got ${detectedFields.length}`
    )
  }

  for (const col of detectedFields) {
    if (!expectedSet.has(col as GlossaryColumn)) {
      throw new Error(`Unexpected column in CSV header: "${col}"`)
    }
  }

  for (const col of GLOSSARY_COLUMNS) {
    if (!detectedSet.has(col)) {
      throw new Error(`Missing column in CSV header: "${col}"`)
    }
  }

  // Type-narrow: we've validated all columns are present
  const rows = result.data as GlossaryRow[]

  const lfCount = (content.match(/\n/g) ?? []).length
  const crlfCount = (content.match(/\r\n/g) ?? []).length
  const lineEnding: "\n" | "\r\n" = crlfCount >= lfCount / 2 ? "\r\n" : "\n"

  return { rows, headerOrder, hadBom, lineEnding }
}

/**
 * Escape a CSV cell value — only quote when strictly necessary
 * (contains delimiter, double-quote, or newline) to match the
 * original CSV's quoting style.
 */
function escapeCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Serialize glossary rows back to CSV text.
 *
 * Uses a hand-rolled serializer instead of Papa.unparse to avoid
 * auto-quoting cells with leading/trailing whitespace — matching
 * the original CSV's quoting conventions exactly.
 *
 * Produces byte-identical output when the same data is round-tripped:
 * - Preserves the original column order via `headerOrder`
 * - Uses the detected line ending
 * - Re-prepends the UTF-8 BOM if `hadBom` was true
 */
export function serializeGlossaryCsv(
  rows: GlossaryRow[],
  opts: SerializeGlossaryOptions
): string {
  const { headerOrder, hadBom, lineEnding } = opts

  const headerLine = headerOrder.join(",")

  const dataLines = rows.map((row) => {
    return headerOrder.map((col) => escapeCell(row[col])).join(",")
  })

  let csv = headerLine + lineEnding + dataLines.join(lineEnding)

  if (!csv.endsWith(lineEnding)) {
    csv += lineEnding
  }

  return hadBom ? BOM + csv : csv
}
