"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useMounted } from "@/hooks/use-mounted"

const SIDEBAR_EXPANDED_KEY = "gtmc_sidebar_expanded"

export function useExpandedFolders() {
  const mounted = useMounted()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set<string>()
  )
  const expandedFoldersRef = useRef(expandedFolders)
  const isFirstRender = useRef(true)

  // Hydrate from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
      if (stored) {
        setExpandedFolders(new Set<string>(JSON.parse(stored)))
      }
    } catch {}
  }, [])

  // Persist to localStorage on subsequent state changes
  useEffect(() => {
    expandedFoldersRef.current = expandedFolders
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    localStorage.setItem(
      SIDEBAR_EXPANDED_KEY,
      JSON.stringify(Array.from(expandedFolders))
    )
  }, [expandedFolders])

  const isFolderExpanded = useCallback(
    (id: string) => {
      return expandedFolders.has(id)
    },
    [expandedFolders]
  )

  return {
    mounted,
    expandedFolders,
    setExpandedFolders,
    expandedFoldersRef,
    isFolderExpanded,
  }
}
