"use client"

import * as React from "react"
import useSWR from "swr"
import type { GlossaryIndexEntry } from "@/lib/glossary/localized-index"
import {
  normalizeGlossarySiteLocale,
  type GlossarySiteLocale,
} from "@/lib/glossary/locales"

const EMPTY: GlossaryIndexEntry[] = []

interface GlossaryIndexResponse {
  locale: GlossarySiteLocale
  entries: GlossaryIndexEntry[]
}

/** Defers the locale-specific index fetch so the full glossary is not bundled into client JavaScript. */
export function useLocalizedGlossary(locale: string): {
  entries: GlossaryIndexEntry[]
  isLoading: boolean
  error: string | null
  retry: () => void
} {
  const siteLocale = normalizeGlossarySiteLocale(locale)
  const url = `/api/glossary?locale=${siteLocale}`

  const { data, error, mutate } = useSWR<GlossaryIndexResponse, Error>(
    url,
    async () => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`glossary fetch ${res.status}`)
      const entries = (await res.json()) as GlossaryIndexEntry[]
      return { locale: siteLocale, entries }
    },
    { keepPreviousData: true }
  )

  const retry = React.useCallback(() => {
    void mutate()
  }, [mutate])

  // Entries from a previous locale are never returned; a locale switch reads as loading.
  return {
    entries: data?.locale === siteLocale ? data.entries : EMPTY,
    isLoading: data?.locale !== siteLocale && !error,
    error: error ? error.message : null,
    retry,
  }
}
