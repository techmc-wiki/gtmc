"use client"

import * as React from "react"
import type { GlossaryEntry } from "@/lib/glossary/manifest"

const EMPTY: GlossaryEntry[] = []

/**
 * Fetches glossary entries from `/api/glossary` after mount so the 221 KB
 * payload is **not** bundled into the client JS.  The component can render a
 * skeleton immediately while the data streams in, cutting FCP.
 */
export function useGlossaryEntries(): {
  entries: GlossaryEntry[]
  isLoading: boolean
} {
  const [entries, setEntries] = React.useState<GlossaryEntry[]>(EMPTY)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    fetch("/api/glossary")
      .then((res) => {
        if (!res.ok) throw new Error(`glossary fetch ${res.status}`)
        return res.json() as Promise<GlossaryEntry[]>
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
  }, [])

  return { entries, isLoading }
}
