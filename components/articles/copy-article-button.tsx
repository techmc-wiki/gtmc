"use client"

import { useCallback } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import { CopyButton } from "@/components/ui/copy-button"

/**
 * "Copy as Markdown" control at the right edge of the article H1. Fetches the
 * public article URL with `Accept: text/markdown` (which the proxy rewrites to
 * the markdown endpoint) and copies the raw markdown to the clipboard.
 */
export function CopyArticleButton() {
  const t = useTranslations("ArticleMeta")
  const pathname = usePathname()

  const fetchMarkdown = useCallback(async () => {
    const response = await fetch(pathname, {
      headers: { Accept: "text/markdown" },
    })
    if (!response.ok) {
      throw new Error(`Markdown request failed with ${response.status}`)
    }
    return response.text()
  }, [pathname])

  return (
    <CopyButton
      getValue={fetchMarkdown}
      label={t("copyPage")}
      copiedLabel={t("copiedButton")}
      failedLabel={t("copyFailed")}
    />
  )
}
