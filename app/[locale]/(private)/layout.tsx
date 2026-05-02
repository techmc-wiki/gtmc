import * as React from "react"
import { getTranslations } from "next-intl/server"

import { DesktopNav } from "@/components/layout/desktop-nav"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { MobileNav } from "@/components/layout/mobile-nav"
import { SiteShell } from "@/components/layout/site-shell"
import { SearchCommand } from "@/components/search/search-command"
import { ProfileButton } from "@/components/ui/profile-button"
import { Logo } from "@/components/ui/logo"
import { auth } from "@/lib/auth"
import { getCurrentUserAuthContext } from "@/lib/auth-context"

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
    } catch (err) {
      console.error("[layout] Failed to resolve auth context:", err)
      isAdmin = false
    }
  }

  const t = await getTranslations("Nav")

  const navLinks = [
    { href: "/articles", label: t("articles") },
    { href: "/draft", label: t("drafts") },
    ...(isAdmin ? [{ href: "/review", label: t("reviewHub") }] : []),
    { href: "/features", label: t("features") },
  ]

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
          <LanguageSwitcher className="hidden sm:flex" />
          <React.Suspense
            fallback={
              <div
                className="
                  size-8 animate-pulse rounded-none border
                  border-tech-main/40 bg-tech-main/10
                  md:size-10
                "
              />
            }>
            <ProfileButton />
          </React.Suspense>
        </>
      }>
      {children}
    </SiteShell>
  )
}
