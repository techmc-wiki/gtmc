import * as React from "react"
import { SessionProvider } from "next-auth/react"

export default async function GlossaryLayout({
  children,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  return <SessionProvider>{children}</SessionProvider>
}
