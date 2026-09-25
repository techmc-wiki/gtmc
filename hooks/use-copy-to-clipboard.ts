"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type CopyState = "idle" | "pending" | "copied" | "failed"

const FEEDBACK_MS = 2000

function isThenable(value: string | Promise<string>): value is Promise<string> {
  return typeof (value as Promise<string>).then === "function"
}

/**
 * Raw Markdown and remote snippets may resolve asynchronously, so the control
 * reports `pending` until the clipboard value is available.
 */
export function useCopyToClipboard(feedbackMs: number = FEEDBACK_MS) {
  const [state, setState] = useState<CopyState>("idle")
  const resetTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    },
    []
  )

  const copy = useCallback(
    async (getValue: () => string | Promise<string>) => {
      if (state === "pending") {
        return
      }

      const value = getValue()
      if (isThenable(value)) {
        setState("pending")
      }

      try {
        await navigator.clipboard.writeText(await value)
        setState("copied")
      } catch (error) {
        console.error("Failed to write to clipboard:", error)
        setState("failed")
      }

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
      resetTimerRef.current = window.setTimeout(
        () => setState("idle"),
        feedbackMs
      )
    },
    [feedbackMs, state]
  )

  return { state, copy }
}
