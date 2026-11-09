/**
 * Validates the properties translation overlay against the pinned upstream
 * submodule. Unknown keys mean upstream renamed or removed something; missing
 * translations are reported as coverage so incremental work stays visible.
 *
 * Run with `pnpm --filter @gtmc/web run check:properties-i18n`.
 */
import { readFile } from "node:fs/promises"
import { workspacePath } from "@/lib/workspace-paths"
import zh from "@/lib/properties/i18n/zh.json"
import type {
  DatasetTranslations,
  PropertyOverlay,
} from "@/lib/properties/i18n/overlay"
import {
  DATASETS,
  type DatasetId,
  type PropertyValue,
} from "@/lib/properties/types"

const files: Record<DatasetId, string> = {
  blocks: "block_data.json",
  experimental: "block_data_experimental.json",
  legacy: "block_data_1.12.json",
  entities: "entity_data.json",
  items: "item_data.json",
}
interface SourceProperty {
  property_name: string
  property_description?: string
  size_type?: string
  entries: Record<string, PropertyValue>
}
type PropertyStructure = (
  | string
  | { category: string; contents: PropertyStructure }
)[]
interface SourceDataset {
  property_structure: PropertyStructure
  properties: Record<string, SourceProperty>
}

const overlay = zh as PropertyOverlay

function strings(value: PropertyValue): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(strings)
  }
  return []
}

function categories(structure: PropertyStructure): string[] {
  return structure.flatMap((item) =>
    typeof item === "string"
      ? []
      : [item.category, ...categories(item.contents)]
  )
}

const data = new Map<DatasetId, SourceDataset>()
for (const dataset of DATASETS) {
  data.set(
    dataset,
    JSON.parse(
      await readFile(
        workspacePath("content", "properties", "data", files[dataset]),
        "utf8"
      )
    ) as SourceDataset
  )
}

const ids = new Set<string>()
const categoriesByDataset = new Map<DatasetId, Set<string>>()
const units = new Set<string>()
const values = new Set<string>()
for (const [dataset, source] of data) {
  for (const [id, property] of Object.entries(source.properties)) {
    ids.add(id)
    if (property.size_type) units.add(property.size_type)
    for (const value of Object.values(property.entries)) {
      for (const text of strings(value)) values.add(text)
    }
  }
  categoriesByDataset.set(
    dataset,
    new Set(categories(source.property_structure))
  )
}

const errors: string[] = []
function unknown(
  label: string,
  keys: Iterable<string>,
  known: ReadonlySet<string>
) {
  for (const key of keys) {
    if (!known.has(key)) errors.push(`unknown ${label}: ${JSON.stringify(key)}`)
  }
}

unknown("property id", Object.keys(overlay.properties ?? {}), ids)
const categoryLabels = new Set<string>()
for (const labels of categoriesByDataset.values()) {
  for (const label of labels) categoryLabels.add(label)
}
unknown("category", Object.keys(overlay.categories ?? {}), categoryLabels)
unknown("unit", Object.keys(overlay.units ?? {}), units)
unknown("value", Object.keys(overlay.values ?? {}), values)
for (const [dataset, translations] of Object.entries(
  overlay.datasets ?? {}
) as [DatasetId, DatasetTranslations][]) {
  const datasetIds = data.get(dataset)
  if (!datasetIds) {
    errors.push(`unknown dataset: ${dataset}`)
    continue
  }
  unknown(
    `${dataset} property id`,
    Object.keys(translations.properties ?? {}),
    new Set(Object.keys(datasetIds.properties))
  )
}

function translated(
  dataset: DatasetId,
  id: string,
  field: "name" | "description"
): boolean {
  return Boolean(
    overlay.datasets?.[dataset]?.properties?.[id]?.[field] ??
    overlay.properties?.[id]?.[field]
  )
}

const report: string[] = []
for (const [dataset, source] of data) {
  const entries = Object.entries(source.properties)
  const names = entries.filter(([id]) => translated(dataset, id, "name")).length
  const described = entries.filter(
    ([, property]) => (property.property_description ?? "").trim() !== ""
  )
  const descriptions = described.filter(([id]) =>
    translated(dataset, id, "description")
  ).length
  report.push(
    `${dataset}: names ${names}/${entries.length}, descriptions ${descriptions}/${described.length}`
  )
}
const missing = [...ids].filter((id) => !translated("blocks", id, "name"))
if (missing.length) {
  report.push(
    `missing names: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? ", …" : ""}`
  )
}

console.log(report.join("\n"))
if (errors.length) {
  console.error(`\n${errors.length} invalid overlay key(s):`)
  console.error(errors.slice(0, 50).join("\n"))
  process.exitCode = 1
}
