"use client"

import * as React from "react"
import { SessionProvider, useSession } from "next-auth/react"
import { DesktopNav, MobileNav, type NavLink } from "@/components/layout/nav"

interface AuthAwareNavProps {
  navLinks: NavLink[]
  contributorLink: NavLink
}

function useAuthAwareLinks(navLinks: NavLink[], contributorLink: NavLink) {
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"

  return React.useMemo(() => {
    let links = navLinks

    if (
      isAuthenticated &&
      !links.some((link) => link.href === contributorLink.href)
    ) {
      const glossaryIndex = links.findIndex((link) => link.href === "/glossary")
      links =
        glossaryIndex === -1
          ? [...links, contributorLink]
          : [
              ...links.slice(0, glossaryIndex + 1),
              contributorLink,
              ...links.slice(glossaryIndex + 1),
            ]
    }

    return links
  }, [contributorLink, isAuthenticated, navLinks])
}

function AuthAwareDesktopNavContent({
  navLinks,
  contributorLink,
}: AuthAwareNavProps) {
  const links = useAuthAwareLinks(navLinks, contributorLink)

  return <DesktopNav navLinks={links} />
}

function AuthAwareMobileNavContent({
  navLinks,
  contributorLink,
}: AuthAwareNavProps) {
  const links = useAuthAwareLinks(navLinks, contributorLink)

  return <MobileNav navLinks={links} />
}

export function AuthAwareDesktopNav(props: AuthAwareNavProps) {
  return (
    <SessionProvider>
      <AuthAwareDesktopNavContent {...props} />
    </SessionProvider>
  )
}

export function AuthAwareMobileNav(props: AuthAwareNavProps) {
  return (
    <SessionProvider>
      <AuthAwareMobileNavContent {...props} />
    </SessionProvider>
  )
}
