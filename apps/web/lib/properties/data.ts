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
  translatedSynthetic,
  translatedUnit,
  type Locale,
  type PropertyOverlay,
} from "./i18n/overlay"
import {
  TAGS_PROPERTY,
  type DatasetId,
  type PropertyCatalog,
  type PropertyEntry,
  type PropertyCondition,
  type PropertyInfo,
  type PropertyKind,
  type PropertyOption,
  type PropertyResults,
  type PropertyValue,
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
/** Upstream flags every tag as its own boolean property. */
const TAG_PREFIX = "tag_"
/** A closed string set larger than this reads as free text rather than an enum. */
const ENUM_LIMIT = 64
/** Numeric properties carry occasional sentinels (`Not Applicable`, `N/A`). */
const NUMERIC_SHARE = 0.9
/** Below this many distinct values, numbers read better as a selector. */
const NUMERIC_DISTINCT = 10
const TAG_PREFIX_PATTERN = /^tag:\s*/i

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
  tags: Map<string, string>
}
/** Raw data projected through one locale's translation overlay. */
interface LocalizedDataset extends RawDataset {
  catalog: PropertyCatalog
  overlay: PropertyOverlay
  tagProperty?: PropertyInfo
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
  let stripped = value.replaceAll(/<br\s*\/?\s*>/gi, "\n")
  let previous: string
  do {
    previous = stripped
    stripped = stripped.replaceAll(/<[^>]*>/g, "")
  } while (stripped !== previous)
  return stripped
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
/** Upstream maps are JSON objects: filter ids may name inherited members. */
function ownProperty(
  source: SourceDataset,
  id: string
): SourceProperty | undefined {
  return Object.hasOwn(source.properties, id)
    ? source.properties[id]
    : undefined
}

const NUMERIC = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/
function parseNumber(value: string | number | boolean): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null
  const text = value.trim()
  if (text === "∞") return Number.POSITIVE_INFINITY
  if (text === "-∞") return Number.NEGATIVE_INFINITY
  if (!NUMERIC.test(text)) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}
/** A tag, or any other yes/no flag, counts as present unless explicitly false. */
function isPresent(value: string | number | boolean): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  return !/^(no|false|)$/i.test(value.trim())
}
function propertyLeaves(
  property: SourceProperty
): (string | number | boolean)[] {
  return [
    property.default_value ?? null,
    ...Object.values(property.entries),
  ].flatMap(leaves)
}
function propertyKind(property: SourceProperty): PropertyKind {
  const items = propertyLeaves(property).filter(
    (item) => String(item).trim() !== ""
  )
  if (!items.length) return "text"
  if (
    items.every(
      (item) =>
        typeof item === "boolean" ||
        (typeof item === "string" && /^(yes|no|true|false)$/i.test(item.trim()))
    )
  ) {
    return "boolean"
  }
  const distinct = new Set(items.map(String))
  const numeric = items.filter((item) => parseNumber(item) !== null).length
  if (
    distinct.size >= NUMERIC_DISTINCT &&
    numeric / items.length >= NUMERIC_SHARE
  ) {
    return "number"
  }
  return distinct.size <= ENUM_LIMIT ? "enum" : "text"
}
function propertyOptions(
  kind: PropertyKind,
  items: (string | number | boolean)[],
  overlay: PropertyOverlay,
  locale: Locale
): PropertyOption[] | undefined {
  if (kind === "boolean") {
    return ["Yes", "No"].map((value) => ({
      value,
      label: translateText(overlay, value),
    }))
  }
  if (kind !== "enum") return undefined
  return [...new Set(items.map(String).filter((item) => item.trim() !== ""))]
    .map((value) => ({ value, label: translateText(overlay, value) }))
    .toSorted((a, b) => {
      const left = parseNumber(a.value)
      const right = parseNumber(b.value)
      if (left !== null && right !== null) {
        return left - right || a.label.localeCompare(b.label, locale)
      }
      return a.label.localeCompare(b.label, locale, { numeric: true })
    })
}
function tagsProperty(
  overlay: PropertyOverlay,
  tags: Map<string, string>,
  locale: Locale
): PropertyInfo | undefined {
  if (!tags.size) return undefined
  const translated = translatedSynthetic(
    overlay,
    TAGS_PROPERTY,
    "Tags",
    "Game tags this entry belongs to."
  )
  return {
    id: TAGS_PROPERTY,
    name: translated.name,
    description: translated.description,
    category: "",
    kind: "tags",
    options: [...tags]
      .map(([value, label]) => ({ value, label }))
      .toSorted((a, b) => a.label.localeCompare(b.label, locale)),
  }
}
/** Tags an entry carries, as display labels. */
function tagsFor(
  source: SourceDataset,
  tags: Map<string, string>,
  name: string
): string[] {
  const present: string[] = []
  for (const [id, label] of tags) {
    const property = source.properties[id]
    if (property && leaves(valueFor(property, name)).some(isPresent)) {
      present.push(label)
    }
  }
  return present.toSorted((a, b) => a.localeCompare(b))
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
        const tags = new Map<string, string>()
        for (const [propertyId, property] of Object.entries(
          source.properties
        )) {
          if (!propertyId.startsWith(TAG_PREFIX)) continue
          const description = plainText(property.property_description ?? "")
          const name = plainText(property.property_name).replace(
            TAG_PREFIX_PATTERN,
            ""
          )
          tags.set(propertyId, description || name)
        }
        return { source, search, tags }
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
      .then(({ source, search, tags }) => {
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
        const properties: PropertyInfo[] = []
        for (const [propertyId, property] of Object.entries(
          source.properties
        )) {
          if (propertyId.startsWith(TAG_PREFIX)) continue
          const translated = translatedProperty(
            overlay,
            id,
            propertyId,
            plainText(property.property_name),
            plainText(property.property_description ?? "")
          )
          const kind = propertyKind(property)
          properties.push({
            id: propertyId,
            name: translated.name,
            description: translated.description,
            category: categories.get(propertyId) ?? "",
            unit: translatedUnit(overlay, property.size_type),
            kind,
            options: propertyOptions(
              kind,
              propertyLeaves(property),
              overlay,
              locale
            ),
          })
        }
        const tagProperty = tagsProperty(overlay, tags, locale)
        if (tagProperty) properties.push(tagProperty)
        return {
          source,
          search,
          tags,
          overlay,
          tagProperty,
          catalog: {
            dataset: id,
            count: source.key_list.length,
            properties: properties.toSorted((a, b) =>
              a.name.localeCompare(b.name, locale)
            ),
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

function entryValue(
  source: SourceDataset,
  overlay: PropertyOverlay,
  tags: Map<string, string>,
  id: string,
  name: string
): PropertyValue {
  return id === TAGS_PROPERTY
    ? tagsFor(source, tags, name)
    : translateValue(overlay, valueFor(source.properties[id], name))
}

export async function getPropertyDetails(
  dataset: DatasetId,
  locale: Locale,
  names: string[]
): Promise<PropertyEntry[]> {
  const { source, search, tags, overlay } = await loadLocalized(dataset, locale)
  return names
    .filter((name) => search.has(name))
    .map((name) => ({
      name,
      values: Object.fromEntries([
        ...Object.keys(source.properties).map((id) => [
          id,
          entryValue(source, overlay, tags, id, name),
        ]),
        [TAGS_PROPERTY, tagsFor(source, tags, name)],
      ]),
    }))
}

function matches(
  overlay: PropertyOverlay,
  value: PropertyValue,
  filter: PropertyCondition,
  kind: PropertyKind | undefined
): boolean {
  const raw = filter.value.trim()
  const selected = selectedValues(filter)
  if (selected !== null) {
    // Multi-select enums match when any selected value equals the row's value;
    // an empty selection applies no constraint.
    return (
      selected.length > 0 &&
      leaves(value).some((leaf) =>
        selected.some((candidate) => equalText(overlay, leaf, candidate))
      )
    )
  }
  const expected = raw.toLowerCase()
  if (filter.operator === "gte" || filter.operator === "lte") {
    const target = parseNumber(raw)
    if (target === null) return false
    return leaves(value).some((leaf) => {
      const number = parseNumber(leaf)
      return (
        number !== null &&
        (filter.operator === "gte" ? number >= target : number <= target)
      )
    })
  }
  if (filter.operator === "eq" && kind === "number") {
    // The numeric input accepts equivalent spellings such as `1.0` or `01`.
    const target = parseNumber(raw)
    if (target !== null) {
      return leaves(value).some((leaf) => parseNumber(leaf) === target)
    }
  }
  // Compare against both the upstream value and its translation so filters
  // work whether the user picks "Yes" or "是".
  const localizedNeedle = translateText(overlay, raw)
  const needles = [expected]
  if (localizedNeedle !== raw) needles.push(localizedNeedle.toLowerCase())
  const equal = leaves(value).some((leaf) => equalText(overlay, leaf, raw))
  if (filter.operator === "eq") return equal
  if (filter.operator === "ne") return !equal
  return leaves(value).some((leaf) => {
    const text = String(leaf).toLowerCase()
    const localizedText = translateText(overlay, String(leaf)).toLowerCase()
    return needles.some(
      (needle) => text.includes(needle) || localizedText.includes(needle)
    )
  })
}
function matchesFilter(
  source: SourceDataset,
  overlay: PropertyOverlay,
  filter: PropertyCondition,
  kind: PropertyKind | undefined,
  name: string
): boolean {
  if (filter.property === TAGS_PROPERTY) {
    if (!filter.value.startsWith(TAG_PREFIX)) return false
    const property = ownProperty(source, filter.value)
    if (!property) return false
    const present = leaves(valueFor(property, name)).some(isPresent)
    return filter.operator === "ne" ? !present : present
  }
  const property = ownProperty(source, filter.property)
  if (!property) return false
  return matches(overlay, valueFor(property, name), filter, kind)
}
function sortValue(
  overlay: PropertyOverlay,
  value: PropertyValue
): string | number | null {
  const values = leaves(value)
  if (!values.length) return null
  // Numeric-like values (including numeric enum strings) order by value; for
  // state-dependent numeric properties, use the lowest state value.
  const numbers = values
    .map((item) => parseNumber(item))
    .filter((number): number is number => number !== null)
  if (numbers.length === values.length) return Math.min(...numbers)
  return values
    .map((item) => translateText(overlay, String(item)))
    .toSorted()[0]
}
/** Selected values of a multi-select condition; `null` means single value. */
function selectedValues(filter: PropertyCondition): string[] | null {
  if (filter.values === undefined) return null
  return filter.values.map((value) => value.trim()).filter(Boolean)
}
/** Equality against both the upstream value and its translation. */
function equalText(
  overlay: PropertyOverlay,
  leaf: string | number | boolean,
  raw: string
): boolean {
  const text = String(leaf)
  const candidates = [text.toLowerCase()]
  const localizedText = translateText(overlay, text)
  if (localizedText !== text) candidates.push(localizedText.toLowerCase())
  const expected = raw.toLowerCase()
  const localizedExpected = translateText(overlay, raw).toLowerCase()
  return candidates.some(
    (candidate) => candidate === expected || candidate === localizedExpected
  )
}

export async function searchProperties(
  dataset: DatasetId,
  locale: Locale,
  options: {
    query: string
    columns: string[]
    filters: PropertyCondition[]
    sort: string
    descending: boolean
    page: number
  }
): Promise<PropertyResults> {
  const { source, search, catalog, overlay, tags, tagProperty } =
    await loadLocalized(dataset, locale)
  const known = new Set([
    ...Object.keys(source.properties),
    ...(tagProperty ? [TAGS_PROPERTY] : []),
  ])
  const columns = [
    ...new Set(options.columns.length ? options.columns : catalog.defaults),
  ]
    .filter((id) => known.has(id))
    .slice(0, 8)
  const groups = options.query
    .toLowerCase()
    .replaceAll("minecraft:", "")
    .replaceAll("_", " ")
    .split("|")
    .map((group) => group.trim().split(/\s+/).filter(Boolean))
    .filter((group) => group.length > 0)
  const queryIsBlank = options.query.trim() === ""
  const kinds = new Map(
    catalog.properties.map((property) => [property.id, property.kind])
  )
  const filters = options.filters.filter((filter) => {
    const selected = selectedValues(filter)
    return selected === null ? filter.value.trim() !== "" : selected.length > 0
  })
  const names = source.key_list.filter((name) => {
    const text = search.get(name) ?? ""
    return (
      (queryIsBlank ||
        groups.some((group) => group.every((term) => text.includes(term)))) &&
      filters.every((filter) =>
        matchesFilter(source, overlay, filter, kinds.get(filter.property), name)
      )
    )
  })
  const sortValues = known.has(options.sort)
    ? new Map(
        names.map((name) => [
          name,
          sortValue(
            overlay,
            entryValue(source, overlay, tags, options.sort, name)
          ),
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
        columns.map((id) => [id, entryValue(source, overlay, tags, id, name)])
      ),
    })),
  }
}
