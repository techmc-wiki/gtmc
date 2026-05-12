import * as React from "react"
import { getTranslations } from "next-intl/server"

import {
  AuthAwareDesktopNav,
  AuthAwareMobileNav,
} from "@/components/layout/auth-aware-nav"
import { AuthIsland } from "@/components/layout/auth-island"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { SiteShell } from "@/components/layout/site-shell"
import { SearchCommand } from "@/components/search/search-command"
import { Logo } from "@/components/ui/logo"

export default async function FeaturesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations("Nav")

  const navLinks = [
    { href: "/articles", label: t("articles") },
    { href: "/draft", label: t("drafts") },
    { href: "/features", label: t("features") },
  ]
  const adminLink = { href: "/review", label: t("reviewHub") }

  return (
    <SiteShell
      leftSlot={
        <>
          <Logo size="md" />
          <AuthAwareDesktopNav navLinks={navLinks} adminLink={adminLink} />
        </>
      }
      rightSlot={
        <>
          <SearchCommand />
          <AuthAwareMobileNav navLinks={navLinks} adminLink={adminLink} />
          <LanguageSwitcher className="hidden sm:flex" />
          <AuthIsland />
        </>
      }>
      {children}
    </SiteShell>
  )
}
