"use client"

import { getReauthLoginUrl, isReauthRequiredError } from "@/lib/admin-reauth"
import React, { ReactNode, useEffect, useRef, useState } from "react"

type ActionFeedbackState = "idle" | "running" | "success" | "error"

interface ActionFormRenderState {
  error: string | null
  isPending: boolean
  state: ActionFeedbackState
}

export function ActionForm({
  action,
  children,
  className,
}: {
  action: () => Promise<void>
  children: ReactNode | ((state: ActionFormRenderState) => ReactNode)
  className?: string
}) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<ActionFeedbackState>("idle")
  const resetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isPending) return

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }

    setError(null)
    setIsPending(true)
    setState("running")

    try {
      await action()
      setState("success")
      resetTimerRef.current = window.setTimeout(() => {
        setState("idle")
      }, 1400)
    } catch (err) {
      if (isReauthRequiredError(err)) {
        window.location.href = getReauthLoginUrl(
          `${window.location.pathname}${window.location.search}`
        )
        return
      }
      setError(err instanceof Error ? err.message : String(err))
      setState("error")
      resetTimerRef.current = window.setTimeout(() => {
        setState("idle")
      }, 3200)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={className}>
        {typeof children === "function"
          ? children({ isPending, state, error })
          : children}
      </form>
      {error && (
        <div className="mt-3 border-l-2 border-red-500/40 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-600">
          {error}
        </div>
      )}
    </>
  )
}
