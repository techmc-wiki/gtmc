import type { ReactNode } from "react"
import { MainSiteShell } from "@/components/layout/main-site-shell"

export const instant = false

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return (
    <MainSiteShell includeContributorLink locale={locale}>
      {children}
    </MainSiteShell>
  )
}
