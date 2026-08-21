import * as React from "react"
import { getTranslations } from "next-intl/server"
import {
  AuthAwareDesktopNav,
  AuthAwareMobileNav,
} from "@/components/layout/auth-aware-nav"
import { AuthIsland } from "@/components/layout/auth-island"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { PageTransition } from "@/components/layout/navigation-effects"
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
  fullBleed?: boolean
}

export async function MainSiteShell({
  children,
  locale,
  includeContributorLink = false,
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
  if (includeContributorLink) {
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

  const leftSlot = (
    <>
      <Logo size="md" />
      <AuthAwareDesktopNav
        navLinks={initialLinks}
        contributorLink={contributorLink}
        adminLink={adminLink}
      />
    </>
  )

  const rightSlot = (
    <>
      <SearchCommand />
      <AuthAwareMobileNav
        navLinks={initialLinks}
        contributorLink={contributorLink}
        adminLink={adminLink}
      />
      <ThemeToggle className="hidden sm:flex" />
      <LanguageSwitcher className="hidden sm:flex" />
      <AuthIsland />
    </>
  )

  return (
    <div className="text-tech-main selection:bg-tech-main/20 selection:text-tech-main-dark relative min-h-screen w-full font-sans">
      <a
        href="#main-content"
        className="focus:bg-surface-overlay focus:border-tech-main focus:text-tech-main-dark sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:border focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:outline-none">
        {tCommonA11y("skipToMainContent")}
      </a>
      <nav
        aria-label={tCommonA11y("mainNavigation")}
        className="border-tech-main/30 bg-surface-overlay/85 fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between md:h-20">
            <div className="flex items-center gap-4 md:gap-8">{leftSlot}</div>

            <div className="flex items-center gap-2 md:gap-3">{rightSlot}</div>
          </div>
        </div>
      </nav>

      <div className="flex min-h-screen w-full flex-col overflow-x-clip">
        <div className="h-16 shrink-0 md:h-20" aria-hidden="true" />

        <main
          id="main-content"
          className={`relative flex w-full flex-1 flex-col ${
            fullBleed ? "" : "p-4 sm:p-6 lg:px-12 lg:py-8"
          }`}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
