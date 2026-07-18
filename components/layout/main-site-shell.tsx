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
  locale: string
  /**
   * Includes the contributor link in the static shell while the client-side
   * auth-aware navigation resolves any admin-only links.
   */
  includeContributorLink?: boolean
  /**
   * If provided, skips the client-side AuthAware check and uses these links statically.
   */
  isAdminServerSide?: boolean
  fullBleed?: boolean
}

export async function MainSiteShell({
  children,
  locale,
  includeContributorLink = false,
  isAdminServerSide,
  fullBleed,
}: MainSiteShellProps) {
  const [t, tCommonA11y] = await Promise.all([
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "CommonA11y" }),
  ])
  const baseLinks = buildNavLinks(t)
  const contributorLink = buildContributorLink(t)
  const adminLink = buildAdminLink(t)

  let initialLinks = baseLinks
  if (includeContributorLink || isAdminServerSide !== undefined) {
    const glossaryIndex = initialLinks.findIndex(
      (link) => link.href === "/glossary"
    )
    initialLinks =
      glossaryIndex === -1
        ? [...initialLinks, contributorLink]
        : [
            ...initialLinks.slice(0, glossaryIndex + 1),
            contributorLink,
            ...initialLinks.slice(glossaryIndex + 1),
          ]
  }
  let serverResolvedLinks = initialLinks
  if (isAdminServerSide) {
    serverResolvedLinks = [...serverResolvedLinks, adminLink]
  }

  const leftSlot = (
    <>
      <Logo size="md" />
      {isAdminServerSide !== undefined ? (
        <DesktopNav navLinks={serverResolvedLinks} />
      ) : (
        <AuthAwareDesktopNav
          navLinks={initialLinks}
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
          navLinks={initialLinks}
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
    <SiteShell
      leftSlot={leftSlot}
      mainNavigationLabel={tCommonA11y("mainNavigation")}
      rightSlot={rightSlot}
      skipToMainContentLabel={tCommonA11y("skipToMainContent")}
      fullBleed={fullBleed}>
      {children}
    </SiteShell>
  )
}
