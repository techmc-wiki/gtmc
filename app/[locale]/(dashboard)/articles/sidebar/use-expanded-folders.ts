"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const SIDEBAR_EXPANDED_KEY = "gtmc_sidebar_expanded"

export function useExpandedFolders() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set<string>()
  )
  const [mounted, setMounted] = useState(false)
  const expandedFoldersRef = useRef(expandedFolders)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
      if (stored) {
        setExpandedFolders(new Set<string>(JSON.parse(stored)))
      }
    } catch {}
    setMounted(true)
  }, [])

  useEffect(() => {
    expandedFoldersRef.current = expandedFolders
    if (!mounted) return
    localStorage.setItem(
      SIDEBAR_EXPANDED_KEY,
      JSON.stringify(Array.from(expandedFolders))
    )
  }, [expandedFolders, mounted])

  const isFolderExpanded = useCallback(
    (id: string) => {
      return expandedFolders.has(id)
    },
    [expandedFolders]
  )

  return {
    expandedFolders,
    setExpandedFolders,
    expandedFoldersRef,
    mounted,
    isFolderExpanded,
  }
}
