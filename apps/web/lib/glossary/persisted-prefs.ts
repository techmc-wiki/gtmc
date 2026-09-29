"use client"

import {
  isGlossaryColumn,
  type GlossaryColumn,
} from "@/lib/glossary/view-options"
import { normalizeGlossarySiteLocale } from "@/lib/glossary/locales"

function columnsKey(locale: string): string {
  return `gtmc:glossary:columns:v2:${normalizeGlossarySiteLocale(locale)}`
}

export function readPersistedGlossaryColumns(
  locale: string
): GlossaryColumn[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(columnsKey(locale))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.every(isGlossaryColumn)) {
      return parsed
    }
  } catch {
    // Storage may be blocked by browser privacy settings.
  }
  return null
}

export function writePersistedGlossaryColumns(
  locale: string,
  columns: readonly GlossaryColumn[]
): void {
  try {
    localStorage.setItem(columnsKey(locale), JSON.stringify(columns))
  } catch {}
}
