import * as React from "react"
import { SessionProvider } from "next-auth/react"
// oxlint-disable-next-line import/no-unassigned-import
import "./glossary.css"

export default async function GlossaryLayout({
  children,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  return <SessionProvider>{children}</SessionProvider>
}
