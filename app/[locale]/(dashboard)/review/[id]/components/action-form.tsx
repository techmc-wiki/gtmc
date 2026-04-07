"use client"

import { getReauthLoginUrl, isReauthRequiredError } from "@/lib/admin-reauth"
import { ReactNode, useState } from "react"

export function ActionForm({
  action,
  children,
  className,
}: {
  action: () => Promise<void>
  children: ReactNode | ((isPending: boolean) => ReactNode)
  className?: string
}) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isPending) return
    setError(null)
    setIsPending(true)
    try {
      await action()
    } catch (err) {
      if (isReauthRequiredError(err)) {
        window.location.href = getReauthLoginUrl(
          `${window.location.pathname}${window.location.search}`
        )
        return
      }
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={className}>
        {typeof children === "function" ? children(isPending) : children}
      </form>
      {error && (
        <div className="mt-3 border-l-2 border-red-500/40 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-600">
          {error}
        </div>
      )}
    </>
  )
}
