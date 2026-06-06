import * as React from "react"
import { getTranslations } from "next-intl/server"
import {
  AuthAwareDesktopNav,
  AuthAwareMobileNav,
} from "@/components/layout/auth-aware-nav"
import { DesktopNav } from "@/components/layout/desktop-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { AuthIsland } from "@/components/layout/auth-island"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { SiteShell } from "@/components/layout/site-shell"
import { SearchCommand } from "@/components/search/search-command"
import { Logo } from "@/components/ui/logo"

function buildNavLinks(t: Awaited<ReturnType<typeof getTranslations<"Nav">>>) {
  return [
    { href: "/articles", label: t("articles") },
    { href: "/draft", label: t("drafts") },
    { href: "/glossary", label: t("glossary") },
    { href: "/features", label: t("features") },
  ]
}

function buildAdminLink(t: Awaited<ReturnType<typeof getTranslations<"Nav">>>) {
  return { href: "/review", label: t("reviewHub") }
}

interface MainSiteShellProps {
  children: React.ReactNode
  /**
   * If provided, skips the client-side AuthAware check and uses these links statically.
   * This is useful for private routes where the session is already checked on the server.
   */
  isAdminServerSide?: boolean
}

export async function MainSiteShell({
  children,
  isAdminServerSide,
}: MainSiteShellProps) {
  const t = await getTranslations("Nav")
  const baseLinks = buildNavLinks(t)
  const adminLink = buildAdminLink(t)

  let serverResolvedLinks = baseLinks
  if (isAdminServerSide) {
    const featuresIndex = serverResolvedLinks.findIndex(
      (link) => link.href === "/features"
    )
    if (featuresIndex === -1) {
      serverResolvedLinks = [...serverResolvedLinks, adminLink]
    } else {
      serverResolvedLinks = [
        ...serverResolvedLinks.slice(0, featuresIndex),
        adminLink,
        ...serverResolvedLinks.slice(featuresIndex),
      ]
    }
  }

  const leftSlot = (
    <>
      <Logo size="md" />
      {isAdminServerSide !== undefined ? (
        <DesktopNav navLinks={serverResolvedLinks} />
      ) : (
        <AuthAwareDesktopNav navLinks={baseLinks} adminLink={adminLink} />
      )}
    </>
  )

  const rightSlot = (
    <>
      <SearchCommand />
      {isAdminServerSide !== undefined ? (
        <MobileNav navLinks={serverResolvedLinks} />
      ) : (
        <AuthAwareMobileNav navLinks={baseLinks} adminLink={adminLink} />
      )}
      <ThemeToggle className="hidden sm:flex" />
      <LanguageSwitcher className="hidden sm:flex" />
      <AuthIsland />
    </>
  )

  return (
    <SiteShell leftSlot={leftSlot} rightSlot={rightSlot}>
      {children}
    </SiteShell>
  )
}
