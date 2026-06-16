"use client"

import * as React from "react"
import {
  addSiteScrollListener,
  getSiteScrollMetrics,
} from "@/hooks/site-scroll-root"

export interface ReadingBookmark {
  slug: string
  title: string
  progress: number
  updatedAt: number
}

const BOOKMARK_KEY = "gtmc_reading_bookmark"

export function readBookmark(): ReadingBookmark | null {
  try {
    const raw = window.localStorage.getItem(BOOKMARK_KEY)
    if (!raw) return null
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
      return parsed as ReadingBookmark
    }
    return null
  } catch {
    return null
  }
}

export function useBookmarkRecorder(slug: string, title: string) {
  React.useEffect(() => {
    if (!slug) return

    let frame = 0
    const save = () => {
      const { clientHeight, scrollHeight, scrollTop } = getSiteScrollMetrics()
      const docHeight = scrollHeight - clientHeight
      const progress =
        docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0
      const bookmark: ReadingBookmark = {
        slug,
        title,
        progress,
        updatedAt: Date.now(),
      }
      try {
        window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmark))
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
