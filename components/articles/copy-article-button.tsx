"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import { Check, Clipboard } from "lucide-react"

/**
 * "Copy as Markdown" control at the right edge of the article H1. Fetches
 * the public article URL with `Accept: text/markdown` — which the proxy
 * rewrites to the markdown endpoint — and copies the raw markdown to the
 * clipboard.
 */
type CopyPageState = "idle" | "pending" | "copied" | "failed"

const COPY_FEEDBACK_MS = 2000

export function CopyArticleButton() {
  const t = useTranslations("ArticleMeta")
  const pathname = usePathname()
  const [state, setState] = useState<CopyPageState>("idle")
  const resetTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    },
    []
  )

  const handleCopy = useCallback(async () => {
    if (state === "pending") {
      return
    }

    setState("pending")
    try {
      const response = await fetch(pathname, {
        headers: { Accept: "text/markdown" },
      })
      if (!response.ok) {
        throw new Error(`Markdown request failed with ${response.status}`)
      }
      const markdown = await response.text()
      await navigator.clipboard.writeText(markdown)
      setState("copied")
    } catch (error) {
      console.error("Failed to copy page markdown:", error)
      setState("failed")
    }

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
    }
    resetTimerRef.current = window.setTimeout(
      () => setState("idle"),
      COPY_FEEDBACK_MS
    )
  }, [pathname, state])

  const label =
    state === "failed"
      ? t("copyPageFailed")
      : state === "copied"
        ? t("copiedButton")
        : t("copyPage")

  return (
    <Button variant="ghost" size="sm"
      type="button"
      onClick={handleCopy}
      disabled={state === "pending"}
      aria-busy={state === "pending"}
      aria-live="polite"
      className={state === "failed" ? "text-destructive" : "text-muted-foreground"}>
      {state === "copied" ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Clipboard className="size-3.5" aria-hidden="true" />
      )}
      {label}
    </Button>
  )
}
