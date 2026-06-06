import * as React from "react"
import { auth } from "@/lib/auth"
import { getCurrentUserAuthContext } from "@/lib/auth-context"
import { MainSiteShell } from "@/components/layout/main-site-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  let isAdmin = false
  if (session?.user?.id) {
    try {
      const ctx = await getCurrentUserAuthContext(session.user.id)
      isAdmin = ctx.role === "ADMIN"
    } catch (error) {
      console.error("[layout] Failed to resolve auth context:", error)
      isAdmin = false
    }
  }

  return <MainSiteShell isAdminServerSide={isAdmin}>{children}</MainSiteShell>
}
