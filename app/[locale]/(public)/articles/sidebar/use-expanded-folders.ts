"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useMounted } from "@/hooks/use-mounted"

const SIDEBAR_EXPANDED_KEY = "gtmc_sidebar_expanded"

export function useExpandedFolders() {
  const mounted = useMounted()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
      if (stored) {
        return new Set<string>(JSON.parse(stored))
      }
    } catch { }
    return new Set<string>()
  })
  const expandedFoldersRef = useRef(expandedFolders)
  const isFirstRender = useRef(true)

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
      if (!mounted) return false
      return expandedFolders.has(id)
    },
    [expandedFolders, mounted]
  )

  return {
    mounted,
    expandedFolders,
    setExpandedFolders,
    expandedFoldersRef,
    isFolderExpanded,
  }
}
