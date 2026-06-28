import type { ReactNode } from "react"
import { MainSiteShell } from "@/components/layout/main-site-shell"

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <MainSiteShell>{children}</MainSiteShell>
}
