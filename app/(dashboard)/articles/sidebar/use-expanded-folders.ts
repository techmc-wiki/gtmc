"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export function useExpandedFolders() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const expandedFoldersRef = useRef(expandedFolders)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    expandedFoldersRef.current = expandedFolders
    if (mounted) {
      localStorage.setItem(
        "gtmc_sidebar_expanded",
        JSON.stringify(Array.from(expandedFolders))
      )
    }
  }, [expandedFolders, mounted])

  const isFolderExpanded = useCallback(
    (id: string) => {
      if (!mounted) return false
      return expandedFolders.has(id)
    },
    [expandedFolders, mounted]
  )

  return {
    expandedFolders,
    setExpandedFolders,
    expandedFoldersRef,
    mounted,
    isFolderExpanded,
  }
}
