import * as React from "react"
import { SessionProvider } from "next-auth/react"
import { MainSiteShell } from "@/components/layout/main-site-shell"

export default async function GlossaryLayout({
  children,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  return (
    <MainSiteShell>
      <SessionProvider>{children}</SessionProvider>
    </MainSiteShell>
  )
}
