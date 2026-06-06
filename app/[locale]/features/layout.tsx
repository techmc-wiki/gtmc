import * as React from "react"
import { MainSiteShell } from "@/components/layout/main-site-shell"

export default async function FeaturesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainSiteShell>{children}</MainSiteShell>
}
