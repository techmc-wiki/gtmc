"use client"

import type { GlossaryDensity } from "@/components/glossary/density-toggle"

const COLUMNS_KEY = "gtmc:glossary:columns:v1"
const DENSITY_KEY = "gtmc:glossary:density:v1"

const DENSITY_VALUES: readonly GlossaryDensity[] = [
  "compact",
  "normal",
  "comfortable",
]

function isDensity(value: unknown): value is GlossaryDensity {
  return (
    typeof value === "string" &&
    (DENSITY_VALUES as readonly string[]).includes(value)
  )
}

export function readPersistedGlossaryColumns(): string[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(COLUMNS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      Array.isArray(parsed) &&
      parsed.every((value) => typeof value === "string")
    ) {
      return parsed
    }
  } catch {
    // private browsing / blocked storage
  }
  return null
}

export function writePersistedGlossaryColumns(columns: string[]): void {
  try {
    localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns))
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
