// eslint-disable-next-line import/no-unassigned-import -- Prevent data and filesystem access in browser bundles.
import "server-only"
import { readFile } from "node:fs/promises"
import { cacheLife, cacheTag } from "next/cache"
import { workspacePath } from "@/lib/workspace-paths"
import { getPropertyOverlay } from "./i18n"
import {
  translateText,
  translateValue,
  translatedCategory,
  translatedProperty,
  translatedUnit,
  type Locale,
  type PropertyOverlay,
} from "./i18n/overlay"
import type {
  DatasetId,
  PropertyCatalog,
  PropertyEntry,
  PropertyFilter,
  PropertyInfo,
  PropertyResults,
  PropertyValue,
} from "./types"

const files: Record<DatasetId, string> = {
  blocks: "block_data.json",
  experimental: "block_data_experimental.json",
  legacy: "block_data_1.12.json",
  entities: "entity_data.json",
  items: "item_data.json",
}
const preferred: Record<DatasetId, string[]> = {
  blocks: [
    "conductive",
    "movable",
    "blast_resistance",
    "hardness",
    "luminance",
  ],
  experimental: [
    "conductive",
    "movable",
    "blast_resistance",
    "hardness",
    "luminance",
  ],
  legacy: ["hardness", "blast_resistance", "get_push_reaction", "material"],
  entities: ["health", "width", "height", "type"],
  items: ["stackability", "survival_obtainable", "renewable"],
}
interface SourceProperty {
  property_name: string
  property_description?: string
  default_value?: PropertyValue
  default_selection?: boolean
  size_type?: string
  entries: Record<string, PropertyValue>
}
type PropertyStructure = (
  | string
  | { category: string; contents: PropertyStructure }
)[]
interface SourceDataset {
  key_list: string[]
  property_structure: PropertyStructure
  properties: Record<string, SourceProperty>
}
/** Upstream data, normalized to plain text, shared by every locale. */
interface RawDataset {
  source: SourceDataset
  search: Map<string, string>
}
/** Raw data projected through one locale's translation overlay. */
interface LocalizedDataset extends RawDataset {
  catalog: PropertyCatalog
  overlay: PropertyOverlay
}

// Upstream strings contain presentation HTML. Expose plain text only; React
// renders it as text, including the original line breaks and state labels.
function plainText(value: string): string {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    infin: "∞",
    times: "×",
    deg: "°",
  }
  return value
    .replaceAll(/<br\s*\/?\s*>/gi, "\n")
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll(
      /&(#x[\da-f]+|#\d+|\w+);/gi,
      (match: string, entity: string) => {
        if (!entity.startsWith("#")) return entities[entity] ?? match
        const code = entity.startsWith("#x")
          ? Number.parseInt(entity.slice(2), 16)
          : Number(entity.slice(1))
        return code >= 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match
      }
    )
    .replaceAll(/[<>]/g, "")
    .trim()
}
function normalize(value: PropertyValue): PropertyValue {
  if (typeof value === "string") return plainText(value)
  if (Array.isArray(value)) return value.map(normalize)
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        plainText(key),
        normalize(child),
      ])
    )
  }
  return value
}
function leaves(value: PropertyValue): (string | number | boolean)[] {
  if (value === null) return []
  if (Array.isArray(value)) return value.flatMap(leaves)
  if (typeof value === "object") return Object.values(value).flatMap(leaves)
  return [value]
}
function valueFor(property: SourceProperty, name: string): PropertyValue {
  return Object.hasOwn(property.entries, name)
    ? property.entries[name]
    : (property.default_value ?? null)
}

const datasets = new Map<DatasetId, Promise<RawDataset>>()
function loadDataset(id: DatasetId): Promise<RawDataset> {
  let pending = datasets.get(id)
  if (!pending) {
    pending = readFile(
      workspacePath("content", "properties", "data", files[id]),
      "utf8"
    )
      .then((text) => {
        const source = JSON.parse(text) as SourceDataset
        for (const property of Object.values(source.properties)) {
          property.entries = Object.fromEntries(
            Object.entries(property.entries).map(([name, value]) => [
              name,
              normalize(value),
            ])
          )
          property.default_value = normalize(property.default_value ?? null)
        }
        const search = new Map(
          source.key_list.map((name) => {
            const aliases = ["id", "block_id", "variants"].flatMap((key) =>
              source.properties[key]
                ? leaves(valueFor(source.properties[key], name))
                : []
            )
            return [
              name,
              [name, ...aliases].join(" ").replaceAll("_", " ").toLowerCase(),
            ]
          })
        )
        return { source, search }
      })
      .catch((error: unknown) => {
        datasets.delete(id)
        throw error
      })
    datasets.set(id, pending)
  }
  return pending
}

const localized = new Map<string, Promise<LocalizedDataset>>()
function loadLocalized(
  id: DatasetId,
  locale: Locale
): Promise<LocalizedDataset> {
  const cacheKey = `${id}:${locale}`
  let pending = localized.get(cacheKey)
  if (!pending) {
    pending = loadDataset(id)
      .then(({ source, search }) => {
        const overlay = getPropertyOverlay(locale)
        const categories = new Map<string, string>()
        function visit(structure: PropertyStructure, category = "") {
          for (const item of structure) {
            if (typeof item === "string") categories.set(item, category)
            else {
              visit(
                item.contents,
                [
                  category,
                  translatedCategory(overlay, plainText(item.category)),
                ]
                  .filter(Boolean)
                  .join(" / ")
              )
            }
          }
        }
        visit(source.property_structure)
        const properties: PropertyInfo[] = Object.entries(source.properties)
          .map(([propertyId, property]) => {
            const translated = translatedProperty(
              overlay,
              id,
              propertyId,
              plainText(property.property_name),
              plainText(property.property_description ?? "")
            )
            return {
              id: propertyId,
              name: translated.name,
              description: translated.description,
              category: categories.get(propertyId) ?? "",
              unit: translatedUnit(overlay, property.size_type),
            }
          })
          .toSorted((a, b) => a.name.localeCompare(b.name, locale))
        return {
          source,
          search,
          overlay,
          catalog: {
            dataset: id,
            count: source.key_list.length,
            properties,
            defaults: preferred[id].filter((key) => key in source.properties),
          },
        }
      })
      .catch((error: unknown) => {
        localized.delete(cacheKey)
        throw error
      })
    localized.set(cacheKey, pending)
  }
  return pending
}

export async function getPropertyCatalog(
  dataset: DatasetId,
  locale: Locale
): Promise<PropertyCatalog> {
  "use cache"
  cacheLife("max")
  cacheTag("properties-catalog")
  return (await loadLocalized(dataset, locale)).catalog
}
export async function getPropertyDetails(
  dataset: DatasetId,
  locale: Locale,
  names: string[]
): Promise<PropertyEntry[]> {
  const { source, search, overlay } = await loadLocalized(dataset, locale)
  return names
    .filter((name) => search.has(name))
    .map((name) => ({
      name,
      values: Object.fromEntries(
        Object.entries(source.properties).map(([id, property]) => [
          id,
          translateValue(overlay, valueFor(property, name)),
        ])
      ),
    }))
}

function matches(
  overlay: PropertyOverlay,
  value: PropertyValue,
  filter: PropertyFilter
): boolean {
  const raw = filter.value.trim()
  const expected = raw.toLowerCase()
  return leaves(value).some((leaf) => {
    if (filter.operator === "gte" || filter.operator === "lte") {
      const number = typeof leaf === "number" ? leaf : Number(leaf)
      const target = Number(expected)
      if (
        String(leaf).trim() === "" ||
        !Number.isFinite(number) ||
        !Number.isFinite(target)
      ) {
        return false
      }
      return filter.operator === "gte" ? number >= target : number <= target
    }
    const text = String(leaf)
    // Compare against both the upstream value and its translation so filters
    // work whether the user types "Yes" or "是".
    const candidates = [text.toLowerCase()]
    const localizedText = translateText(overlay, text)
    if (localizedText !== text) candidates.push(localizedText.toLowerCase())
    const needles = [expected]
    const localizedNeedle = translateText(overlay, raw)
    if (localizedNeedle !== raw) needles.push(localizedNeedle.toLowerCase())
    return filter.operator === "eq"
      ? candidates.some((candidate) => needles.includes(candidate))
      : candidates.some((candidate) =>
          needles.some((needle) => candidate.includes(needle))
        )
  })
}
function sortValue(
  overlay: PropertyOverlay,
  value: PropertyValue
): string | number | null {
  const values = leaves(value)
  if (!values.length) return null
  // For state-dependent numeric properties, order by the lowest state value.
  if (values.every((item) => typeof item === "number")) {
    return Math.min(...values)
  }
  return values
    .map((item) => translateText(overlay, String(item)))
    .toSorted()[0]
}
export async function searchProperties(
  dataset: DatasetId,
  locale: Locale,
  options: {
    query: string
    columns: string[]
    filters: PropertyFilter[]
    sort: string
    descending: boolean
    page: number
  }
): Promise<PropertyResults> {
  const { source, search, catalog, overlay } = await loadLocalized(
    dataset,
    locale
  )
  const columns = [
    ...new Set(options.columns.length ? options.columns : catalog.defaults),
  ]
    .filter((id) => Object.hasOwn(source.properties, id))
    .slice(0, 8)
  const groups = options.query
    .toLowerCase()
    .replaceAll("minecraft:", "")
    .replaceAll("_", " ")
    .split("|")
    .map((group) => group.trim().split(/\s+/).filter(Boolean))
    .filter((group) => group.length > 0)
  const queryIsBlank = options.query.trim() === ""
  const filters = options.filters.filter((filter) => filter.value.trim())
  const names = source.key_list.filter((name) => {
    const text = search.get(name) ?? ""
    return (
      (queryIsBlank ||
        groups.some((group) => group.every((term) => text.includes(term)))) &&
      filters.every(
        (filter) =>
          Object.hasOwn(source.properties, filter.property) &&
          matches(
            overlay,
            valueFor(source.properties[filter.property], name),
            filter
          )
      )
    )
  })
  const property = Object.hasOwn(source.properties, options.sort)
    ? source.properties[options.sort]
    : undefined
  const sortValues = property
    ? new Map(
        names.map((name) => [
          name,
          sortValue(overlay, valueFor(property, name)),
        ])
      )
    : null
  names.sort((a, b) => {
    const left = sortValues ? sortValues.get(a) : a
    const right = sortValues ? sortValues.get(b) : b
    if (left == null) return right == null ? a.localeCompare(b) : 1
    if (right == null) return -1
    const order =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), locale, { numeric: true })
    return (options.descending ? -order : order) || a.localeCompare(b)
  })
  const pages = Math.max(1, Math.ceil(names.length / 40))
  const page = Math.min(options.page, pages)
  return {
    columns,
    total: names.length,
    page,
    pages,
    entries: names.slice((page - 1) * 40, page * 40).map((name) => ({
      name,
      values: Object.fromEntries(
        columns.map((id) => [
          id,
          translateValue(overlay, valueFor(source.properties[id], name)),
        ])
      ),
    })),
  }
}
