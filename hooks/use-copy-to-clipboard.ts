"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type CopyState = "idle" | "pending" | "copied" | "failed"

/** How long copied/failed feedback stays up before the control returns to idle. */
const FEEDBACK_MS = 2000

function isThenable(value: string | Promise<string>): value is Promise<string> {
  return typeof (value as Promise<string>).then === "function"
}

/**
 * Clipboard write with transient `copied`/`failed` feedback. Text that needs a
 * network round trip (raw markdown, remote snippets) resolves lazily: the
 * control reports `pending` until the promise settles.
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
