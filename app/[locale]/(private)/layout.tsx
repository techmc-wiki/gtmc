import * as React from "react"
import { getTranslations } from "next-intl/server"

import { AuthIsland } from "@/components/layout/auth-island"
import { DesktopNav } from "@/components/layout/desktop-nav"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { MobileNav } from "@/components/layout/mobile-nav"
import { SiteShell } from "@/components/layout/site-shell"
import { SearchCommand } from "@/components/search/search-command"
import { Logo } from "@/components/ui/logo"
import { auth } from "@/lib/auth"
import { getCurrentUserAuthContext } from "@/lib/auth-context"

function buildNavLinks(
  t: Awaited<ReturnType<typeof getTranslations<"Nav">>>,
  isAdmin: boolean
) {
  return [
    { href: "/articles", label: t("articles") },
    { href: "/draft", label: t("drafts") },
    { href: "/glossary", label: t("glossary") },
    ...(isAdmin ? [{ href: "/review", label: t("reviewHub") }] : []),
    { href: "/features", label: t("features") },
  ]
}

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

  const t = await getTranslations("Nav")
  const navLinks = buildNavLinks(t, isAdmin)

  return (
    <SiteShell
      leftSlot={
        <>
          <Logo size="md" />
          <DesktopNav navLinks={navLinks} />
        </>
      }
      rightSlot={
        <>
          <SearchCommand />
          <MobileNav navLinks={navLinks} />
          <ThemeToggle className="hidden sm:flex" />
          <LanguageSwitcher className="hidden sm:flex" />
          <AuthIsland />
        </>
      }>
      {children}
    </SiteShell>
  )
}
