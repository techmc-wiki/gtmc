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
export interface PropertyInfo {
  id: string
  name: string
  description: string
  category: string
  unit?: string
}
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
export const FILTER_OPERATORS = ["eq", "contains", "gte", "lte"] as const
export type FilterOperator = (typeof FILTER_OPERATORS)[number]
export interface PropertyFilter {
  id: string
  property: string
  operator: FilterOperator
  value: string
}
export interface PropertyResults {
  entries: PropertyEntry[]
  total: number
  page: number
  pages: number
  columns: string[]
}
