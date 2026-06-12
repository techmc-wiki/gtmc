"use client"

import { useBookmarkRecorder } from "@/hooks/use-reading-bookmark"

export function BookmarkRecorder({
  slug,
  title,
}: {
  slug: string
  title: string
}) {
  useBookmarkRecorder(slug, title)
  return null
}
