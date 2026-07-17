"use client"

import {
  GLOSSARY_DENSITIES,
  isGlossaryTableColumn,
  type GlossaryDensity,
  type GlossaryTableColumn,
} from "@/lib/glossary/view-options"
import { normalizeGlossarySiteLocale } from "@/lib/glossary/locales"

const DENSITY_KEY = "gtmc:glossary:density:v1"

function isDensity(value: unknown): value is GlossaryDensity {
  return (
    typeof value === "string" &&
    (GLOSSARY_DENSITIES as readonly string[]).includes(value)
  )
}

function columnsKey(locale: string): string {
  return `gtmc:glossary:columns:v2:${normalizeGlossarySiteLocale(locale)}`
}

export function readPersistedGlossaryColumns(
  locale: string
): GlossaryTableColumn[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(columnsKey(locale))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.every(isGlossaryTableColumn)) {
      return parsed
    }
  } catch {
    // private browsing / blocked storage
  }
  return null
}

export function writePersistedGlossaryColumns(
  locale: string,
  columns: readonly GlossaryTableColumn[]
): void {
  try {
    localStorage.setItem(columnsKey(locale), JSON.stringify(columns))
  } catch {
    // ignore
  }
}

export function readPersistedGlossaryDensity(): GlossaryDensity | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(DENSITY_KEY)
    if (isDensity(raw)) return raw
  } catch {
    // ignore
  }
  return null
}

export function writePersistedGlossaryDensity(density: GlossaryDensity): void {
  try {
    localStorage.setItem(DENSITY_KEY, density)
  } catch {
    // ignore
  }
}
