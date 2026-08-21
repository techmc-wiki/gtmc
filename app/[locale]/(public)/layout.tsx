import type { ReactNode } from "react"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { MainSiteShell } from "@/components/layout/main-site-shell"
export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return (
    <MainSiteShell locale={locale}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </MainSiteShell>
  )
}
