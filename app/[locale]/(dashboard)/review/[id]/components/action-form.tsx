"use client"

import { ReauthRequiredError } from "@/lib/admin-reauth"
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isPending) return
    setIsPending(true)
    try {
      await action()
    } catch (error) {
      if (error instanceof ReauthRequiredError) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
        return
      }
      throw error
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {typeof children === "function" ? children(isPending) : children}
    </form>
  )
}
