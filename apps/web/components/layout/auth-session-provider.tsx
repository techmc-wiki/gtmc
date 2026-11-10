"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"

/**
 * Single session boundary for the site shell.
 *
 * next-auth fetches the session on mount and broadcasts every fetch to its
 * other providers, so each additional provider below the shell multiplies
 * `/api/auth/session` invocations. Consumers share this one provider; its
 * `refetchOnWindowFocus` is off because sign-in and sign-out still propagate
 * through the provider's broadcast channel.
 */
export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>
  )
}
