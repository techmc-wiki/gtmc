"use client"

import { useCallback, useEffect, useRef, useState } from "react"

function getInitialExpandedFolders(): Set<string> {
  if (typeof window === "undefined") return new Set<string>()
  try {
    const stored = localStorage.getItem("gtmc_sidebar_expanded")
    if (stored) {
      return new Set<string>(JSON.parse(stored))
    }
  } catch {}
  return new Set<string>()
}

export function useExpandedFolders() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    getInitialExpandedFolders
  )
  const mounted = true
  const expandedFoldersRef = useRef(expandedFolders)

  useEffect(() => {
    expandedFoldersRef.current = expandedFolders
    localStorage.setItem(
      "gtmc_sidebar_expanded",
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
    expandedFolders,
    setExpandedFolders,
    expandedFoldersRef,
    mounted,
    isFolderExpanded,
  }
}
