"use client"

import { ReauthRequiredError } from "@/lib/admin-reauth"
import { ReactNode } from "react"

export function ActionForm({
  action,
  children,
  className,
}: {
  action: () => Promise<void>
  children: ReactNode
  className?: string
}) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      await action()
    } catch (error) {
      if (error instanceof ReauthRequiredError) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
        return
      }
      throw error
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  )
}
