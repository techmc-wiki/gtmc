import { routing } from "@/i18n/routing"
import type { DatasetId, PropertyValue } from "../types"

export type Locale = (typeof routing.locales)[number]

export const DEFAULT_LOCALE = routing.defaultLocale

export function normalizeLocale(value: string): Locale {
  return routing.locales.includes(value as Locale)
    ? (value as Locale)
    : routing.defaultLocale
}

/**
 * Translates the upstream `MCPropertyEncyclopedia` strings without modifying
 * the submodule. Every field is optional: a missing entry falls back to the
 * upstream English string, so translations can land incrementally and an
 * upstream rename can never break the page.
 *
 * Property ids are stable upstream identifiers. Categories and units are keyed
 * by their English display string because upstream publishes no id for them.
 * Entry names (`key_list`) are not translated yet.
 */
export interface PropertyTranslation {
  name?: string
  description?: string
}

export interface DatasetTranslations {
  properties?: Record<string, PropertyTranslation>
}

export interface PropertyOverlay {
  properties?: Record<string, PropertyTranslation>
  /** Generated properties with no upstream counterpart, keyed by id. */
  synthetic?: Record<string, PropertyTranslation>
  datasets?: Partial<Record<DatasetId, DatasetTranslations>>
  categories?: Record<string, string>
  units?: Record<string, string>
  values?: Record<string, string>
}

export const EMPTY_OVERLAY: PropertyOverlay = {}

/**
 * Resolves a property's display strings. Descriptions stay empty when the
 * upstream description is empty: the legacy dataset has no descriptions, and a
 * translation written for another dataset must not fill that gap.
 */
export function translatedProperty(
  overlay: PropertyOverlay,
  dataset: DatasetId,
  id: string,
  name: string,
  description: string
): { name: string; description: string } {
  const override = overlay.datasets?.[dataset]?.properties?.[id]
  const base = overlay.properties?.[id]
  return {
    name: override?.name ?? base?.name ?? name,
    description: description
      ? (override?.description ?? base?.description ?? description)
      : "",
  }
}

export function translatedCategory(
  overlay: PropertyOverlay,
  category: string
): string {
  return overlay.categories?.[category] ?? category
}

/** Resolves the display strings of a property this app generates itself. */
export function translatedSynthetic(
  overlay: PropertyOverlay,
  id: string,
  name: string,
  description: string
): { name: string; description: string } {
  const override = overlay.synthetic?.[id]
  return {
    name: override?.name ?? name,
    description: override?.description ?? description,
  }
}

export function translatedUnit(
  overlay: PropertyOverlay,
  unit: string | undefined
): string | undefined {
  if (!unit) return unit
  return overlay.units?.[unit] ?? unit
}

export function translateText(overlay: PropertyOverlay, text: string): string {
  return overlay.values?.[text] ?? text
}

/** Translates value leaves only; state-label object keys stay untouched. */
export function translateValue(
  overlay: PropertyOverlay,
  value: PropertyValue
): PropertyValue {
  if (typeof value === "string") return translateText(overlay, value)
  if (Array.isArray(value)) {
    return value.map((item) => translateValue(overlay, item))
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        translateValue(overlay, child),
      ])
    )
  }
  return value
}
