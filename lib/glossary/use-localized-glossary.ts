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
  const [isLoading, setIsLoading] = React.useState(true)
  const siteLocale = normalizeGlossarySiteLocale(locale)

  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetch(`/api/glossary?locale=${siteLocale}`)
      .then((res) => {
        if (!res.ok) throw new Error(`glossary fetch ${res.status}`)
        return res.json() as Promise<GlossaryIndexEntry[]>
      })
      .then((data) => {
        if (!cancelled) {
          setEntries(data)
          setIsLoading(false)
        }
      })
      .catch((error) => {
        console.error("Failed to load glossary entries:", error)
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [siteLocale])

  return { entries, isLoading }
}
