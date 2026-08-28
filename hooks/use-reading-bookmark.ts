"use client"

import * as React from "react"
import {
  addSiteScrollListener,
  getSiteScrollProgress,
} from "@/hooks/site-scroll-root"

export interface ReadingBookmark {
  slug: string
  title: string
  progress: number
  updatedAt: number
}

const BOOKMARK_KEY = "gtmc_reading_bookmark"

const listeners = new Set<() => void>()

function emitBookmarkChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribeBookmark(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === BOOKMARK_KEY || event.key === null) {
      onStoreChange()
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage)
  }
  return () => {
    listeners.delete(onStoreChange)
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage)
    }
  }
}

let cachedRaw: string | null = null
let cachedBookmark: ReadingBookmark | null = null

export function readBookmark(): ReadingBookmark | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(BOOKMARK_KEY)
    if (raw === cachedRaw) {
      return cachedBookmark
    }
    cachedRaw = raw
    if (!raw) {
      cachedBookmark = null
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "slug" in parsed &&
      typeof parsed.slug === "string" &&
      "title" in parsed &&
      typeof parsed.title === "string" &&
      "progress" in parsed &&
      typeof parsed.progress === "number" &&
      "updatedAt" in parsed &&
      typeof parsed.updatedAt === "number"
    ) {
      cachedBookmark = parsed as ReadingBookmark
      return cachedBookmark
    }
    cachedBookmark = null
    return null
  } catch {
    cachedBookmark = null
    return null
  }
}

const getServerSnapshot = (): null => null

export function useReadingBookmark(): ReadingBookmark | null {
  return React.useSyncExternalStore(
    subscribeBookmark,
    readBookmark,
    getServerSnapshot
  )
}
export function useBookmarkRecorder(slug: string, title: string) {
  React.useEffect(() => {
    if (!slug) return

    let frame = 0
    const save = () => {
      const progress = getSiteScrollProgress()
      const bookmark: ReadingBookmark = {
        slug,
        title,
        progress,
        updatedAt: Date.now(),
      }
      try {
        window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmark))
        emitBookmarkChange()
      } catch {
        // localStorage unavailable (private mode, quota) — bookmark is best-effort
      }
    }

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(save)
    }

    save()
    const removeSiteScrollListener = addSiteScrollListener(onScroll, {
      passive: true,
    })
    return () => {
      cancelAnimationFrame(frame)
      removeSiteScrollListener()
    }
  }, [slug, title])
}
