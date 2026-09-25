"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useMounted } from "@/hooks/use-mounted"

const SIDEBAR_EXPANDED_KEY = "gtmc_sidebar_expanded:v1"

export function useExpandedFolders() {
  const mounted = useMounted()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set<string>()
  )
  const expandedFoldersRef = useRef(expandedFolders)
  const isFirstRender = useRef(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
        if (stored) {
          setExpandedFolders(new Set<string>(JSON.parse(stored)))
        }
      } catch {}
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Do not overwrite storage before the deferred read restores the user's state.
  useEffect(() => {
    expandedFoldersRef.current = expandedFolders
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    localStorage.setItem(
      SIDEBAR_EXPANDED_KEY,
      JSON.stringify([...expandedFolders])
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
