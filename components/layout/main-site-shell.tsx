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
    { href: "/pdf", label: t("pdf") },
    { href: "/glossary", label: t("glossary") },
    { href: "/about", label: t("about") },
    { href: "/authors", label: t("authors") },
    { href: "/features", label: t("features") },
  ]
}

function buildContributorLink(
  t: Awaited<ReturnType<typeof getTranslations<"Nav">>>
) {
  return { href: "/draft", label: t("drafts") }
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
  fullBleed?: boolean
}

export async function MainSiteShell({
  children,
  isAdminServerSide,
  fullBleed,
}: MainSiteShellProps) {
  const t = await getTranslations("Nav")
  const baseLinks = buildNavLinks(t)
  const contributorLink = buildContributorLink(t)
  const adminLink = buildAdminLink(t)

  // Private routes pass isAdminServerSide, which implies an authenticated
  // session — the contributor link is always shown there.
  let serverResolvedLinks = baseLinks
  if (isAdminServerSide !== undefined) {
    const glossaryIndex = serverResolvedLinks.findIndex(
      (link) => link.href === "/glossary"
    )
    serverResolvedLinks =
      glossaryIndex === -1
        ? [...serverResolvedLinks, contributorLink]
        : [
            ...serverResolvedLinks.slice(0, glossaryIndex + 1),
            contributorLink,
            ...serverResolvedLinks.slice(glossaryIndex + 1),
          ]
  }
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
        <AuthAwareDesktopNav
          navLinks={baseLinks}
          contributorLink={contributorLink}
          adminLink={adminLink}
        />
      )}
    </>
  )

  const rightSlot = (
    <>
      <SearchCommand />
      {isAdminServerSide !== undefined ? (
        <MobileNav navLinks={serverResolvedLinks} />
      ) : (
        <AuthAwareMobileNav
          navLinks={baseLinks}
          contributorLink={contributorLink}
          adminLink={adminLink}
        />
      )}
      <ThemeToggle className="hidden sm:flex" />
      <LanguageSwitcher className="hidden sm:flex" />
      <AuthIsland />
    </>
  )

  return (
    <SiteShell leftSlot={leftSlot} rightSlot={rightSlot} fullBleed={fullBleed}>
      {children}
    </SiteShell>
  )
}
