// eslint-disable-next-line import/no-unassigned-import -- Prevent data and filesystem access in browser bundles.
import "server-only"
import { readFile } from "node:fs/promises"
import { cacheLife } from "next/cache"
import { workspacePath } from "@/lib/workspace-paths"
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
interface Dataset {
  source: SourceDataset
  catalog: PropertyCatalog
  search: Map<string, string>
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

const datasets = new Map<DatasetId, Promise<Dataset>>()
function loadDataset(id: DatasetId): Promise<Dataset> {
  let pending = datasets.get(id)
  if (!pending) {
    pending = readFile(
      workspacePath("content", "properties", "data", files[id]),
      "utf8"
    )
      .then((text) => {
        const source = JSON.parse(text) as SourceDataset
        const categories = new Map<string, string>()
        function visit(structure: PropertyStructure, category = "") {
          for (const item of structure) {
            if (typeof item === "string") categories.set(item, category)
            else {
              visit(
                item.contents,
                [category, plainText(item.category)].filter(Boolean).join(" / ")
              )
            }
          }
        }
        visit(source.property_structure)
        const properties: PropertyInfo[] = Object.entries(source.properties)
          .map(([key, property]) => {
            property.entries = Object.fromEntries(
              Object.entries(property.entries).map(([name, value]) => [
                name,
                normalize(value),
              ])
            )
            property.default_value = normalize(property.default_value ?? null)
            return {
              id: key,
              name: plainText(property.property_name),
              description: plainText(property.property_description ?? ""),
              category: categories.get(key) ?? "",
              unit: property.size_type,
            }
          })
          .toSorted((a, b) => a.name.localeCompare(b.name, "en"))
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
          legacy: [
            "hardness",
            "blast_resistance",
            "get_push_reaction",
            "material",
          ],
          entities: ["health", "width", "height", "type"],
          items: ["stackability", "survival_obtainable", "renewable"],
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
        return {
          source,
          search,
          catalog: {
            dataset: id,
            count: source.key_list.length,
            properties,
            defaults: preferred[id].filter((key) => key in source.properties),
          },
        }
      })
      .catch((error: unknown) => {
        datasets.delete(id)
        throw error
      })
    datasets.set(id, pending)
  }
  return pending
}

export async function getPropertyCatalog(
  dataset: DatasetId
): Promise<PropertyCatalog> {
  "use cache"
  cacheLife("max")
  return (await loadDataset(dataset)).catalog
}
export async function getPropertyDetails(
  dataset: DatasetId,
  names: string[]
): Promise<PropertyEntry[]> {
  const { source, search } = await loadDataset(dataset)
  return names
    .filter((name) => search.has(name))
    .map((name) => ({
      name,
      values: Object.fromEntries(
        Object.entries(source.properties).map(([id, property]) => [
          id,
          valueFor(property, name),
        ])
      ),
    }))
}

function matches(value: PropertyValue, filter: PropertyFilter): boolean {
  const expected = filter.value.trim().toLowerCase()
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
    const text = String(leaf).toLowerCase()
    return filter.operator === "eq"
      ? text === expected
      : text.includes(expected)
  })
}
function sortValue(value: PropertyValue): string | number | null {
  const values = leaves(value)
  if (!values.length) return null
  // For state-dependent numeric properties, order by the lowest state value.
  if (values.every((item) => typeof item === "number")) {
    return Math.min(...values)
  }
  return values.map(String).toSorted()[0]
}
export async function searchProperties(
  dataset: DatasetId,
  options: {
    query: string
    columns: string[]
    filters: PropertyFilter[]
    sort: string
    descending: boolean
    page: number
  }
): Promise<PropertyResults> {
  const { source, search, catalog } = await loadDataset(dataset)
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
  const filters = options.filters.filter((filter) => filter.value.trim())
  const names = source.key_list.filter((name) => {
    const text = search.get(name) ?? ""
    return (
      groups.some((group) => group.every((term) => text.includes(term))) &&
      filters.every(
        (filter) =>
          Object.hasOwn(source.properties, filter.property) &&
          matches(valueFor(source.properties[filter.property], name), filter)
      )
    )
  })
  const property = Object.hasOwn(source.properties, options.sort)
    ? source.properties[options.sort]
    : undefined
  const sortValues = property
    ? new Map(names.map((name) => [name, sortValue(valueFor(property, name))]))
    : null
  names.sort((a, b) => {
    const left = sortValues ? sortValues.get(a) : a
    const right = sortValues ? sortValues.get(b) : b
    if (left == null) return right == null ? a.localeCompare(b) : 1
    if (right == null) return -1
    const order =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), "en", { numeric: true })
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
        columns.map((id) => [id, valueFor(source.properties[id], name)])
      ),
    })),
  }
}
