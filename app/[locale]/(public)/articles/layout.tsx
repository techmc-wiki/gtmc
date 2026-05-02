import * as React from "react"
import { DesktopNav } from "@/components/layout/desktop-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { SiteShell } from "@/components/layout/site-shell"
import { Logo } from "@/components/ui/logo"
import { AuthIsland } from "@/components/layout/auth-island"
import { ArticlesLayoutClient } from "./articles-layout-client"

const navLinks = [
  { href: "/articles", label: "ARTICLES" },
  { href: "/draft", label: "DRAFTS" },
  { href: "/features", label: "FEATURES" },
]

export default function ArticlesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SiteShell
      leftSlot={
        <>
          <Logo size="md" />
          <DesktopNav navLinks={navLinks} />
          <MobileNav navLinks={navLinks} />
        </>
      }
      rightSlot={<AuthIsland />}>
      <ArticlesLayoutClient tree={[]}>{children}</ArticlesLayoutClient>
    </SiteShell>
  )
}
