export const DATASETS = [
  "blocks",
  "experimental",
  "legacy",
  "entities",
  "items",
] as const
export type DatasetId = (typeof DATASETS)[number]
export type PropertyValue =
  | string
  | number
  | boolean
  | null
  | PropertyValue[]
  | { [state: string]: PropertyValue }
/**
 * How a property's values are expressed, which decides the filter control:
 * numbers take an operator and a numeric input, closed string sets and
 * booleans take a value selector, and tags take a tag plus a yes/no selector.
 */
export const PROPERTY_KINDS = [
  "number",
  "boolean",
  "enum",
  "text",
  "tags",
] as const
export type PropertyKind = (typeof PROPERTY_KINDS)[number]
export interface PropertyOption {
  /** Upstream leaf value, stored in the filter. */
  value: string
  /** Localized display string. */
  label: string
}
export interface PropertyInfo {
  id: string
  name: string
  description: string
  category: string
  unit?: string
  kind: PropertyKind
  options?: PropertyOption[]
}
/** Synthetic property that gathers every upstream `tag_*` boolean. */
export const TAGS_PROPERTY = "tags"
export interface PropertyCatalog {
  dataset: DatasetId
  count: number
  properties: PropertyInfo[]
  defaults: string[]
}
export interface PropertyEntry {
  name: string
  values: Record<string, PropertyValue>
}
export const FILTER_OPERATORS = ["eq", "ne", "contains", "gte", "lte"] as const
export type FilterOperator = (typeof FILTER_OPERATORS)[number]
/** One filter condition; this is what a lookup request carries. */
export interface PropertyCondition {
  property: string
  /** `ne` negates a tag membership; other kinds only use the operators their control offers. */
  operator: FilterOperator
  /** Numeric text, an enum/boolean value, or a `tag_*` property id. */
  value: string
}
export interface PropertyFilter {
  /** Client-only row identity; it is not part of the query. */
  id: string
  property: string
  /**
   * Empty while a tag condition has no presence chosen; other kinds always
   * carry an operator, and an empty one leaves the condition unapplied.
   */
  operator: FilterOperator | ""
  value: string
}
export interface PropertyResults {
  entries: PropertyEntry[]
  total: number
  page: number
  pages: number
  columns: string[]
}
