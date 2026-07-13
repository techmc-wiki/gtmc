import * as React from "react"
import { MainSiteShell } from "@/components/layout/main-site-shell"

export default async function PdfLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return <MainSiteShell locale={locale}>{children}</MainSiteShell>
}
