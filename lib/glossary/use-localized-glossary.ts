"use client"

import * as React from "react"
import type { GlossaryIndexEntry } from "@/lib/glossary/localized-index"
import { normalizeGlossarySiteLocale } from "@/lib/glossary/locales"

const EMPTY: GlossaryIndexEntry[] = []

/**
 * Fetches generated glossary entries after mount so the full data set is not
 * bundled into client JavaScript. The caller can render a skeleton while the
 * locale-specific index streams in.
 */
export function useLocalizedGlossary(locale: string): {
  entries: GlossaryIndexEntry[]
  isLoading: boolean
} {
  const [entries, setEntries] = React.useState<GlossaryIndexEntry[]>(EMPTY)
  const [loadedLocale, setLoadedLocale] = React.useState<string | null>(null)
  const siteLocale = normalizeGlossarySiteLocale(locale)
  const isLoading = loadedLocale !== siteLocale

  React.useEffect(() => {
    let cancelled = false

    fetch(`/api/glossary?locale=${siteLocale}`)
      .then((res) => {
        if (!res.ok) throw new Error(`glossary fetch ${res.status}`)
        return res.json() as Promise<GlossaryIndexEntry[]>
      })
      .then((data) => {
        if (!cancelled) {
          setEntries(data)
          setLoadedLocale(siteLocale)
        }
      })
      .catch((error) => {
        console.error("Failed to load glossary entries:", error)
        if (!cancelled) setLoadedLocale(siteLocale)
      })

    return () => {
      cancelled = true
    }
  }, [siteLocale])

  return { entries, isLoading }
}
