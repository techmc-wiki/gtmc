"use client"

import * as React from "react"
import { SessionProvider, useSession } from "next-auth/react"
import { DesktopNav } from "@/components/layout/desktop-nav"
import { MobileNav } from "@/components/layout/mobile-nav"

interface NavLink {
  href: string
  label: string
}

interface AuthAwareNavProps {
  navLinks: NavLink[]
  adminLink: NavLink
}

interface NavAuthResponse {
  isAdmin: boolean
}

let cachedNavAuth: NavAuthResponse | null = null
let pendingNavAuth: Promise<NavAuthResponse> | null = null

async function fetchNavAuth(): Promise<NavAuthResponse> {
  if (cachedNavAuth) {
    return cachedNavAuth
  }

  pendingNavAuth ??= fetch("/api/auth/nav", {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) {
        return { isAdmin: false }
      }

      const data: unknown = await response.json()

      if (
        typeof data === "object" &&
        data !== null &&
        "isAdmin" in data &&
        typeof data.isAdmin === "boolean"
      ) {
        return { isAdmin: data.isAdmin }
      }

      return { isAdmin: false }
    })
    .catch(() => ({ isAdmin: false }))
    .finally(() => {
      pendingNavAuth = null
    })

  cachedNavAuth = await pendingNavAuth
  return cachedNavAuth
}

function useAdminAwareLinks(navLinks: NavLink[], adminLink: NavLink) {
  const { status } = useSession()
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    if (status !== "authenticated") return

    let ignore = false
    fetchNavAuth().then((result) => {
      if (!ignore) {
        setIsAdmin(result.isAdmin)
      }
    })

    return () => {
      ignore = true
    }
  }, [status])

  const effectiveIsAdmin = status === "authenticated" && isAdmin

  return React.useMemo(() => {
    if (!effectiveIsAdmin) {
      return navLinks
    }

    if (navLinks.some((link) => link.href === adminLink.href)) {
      return navLinks
    }

    const featuresIndex = navLinks.findIndex(
      (link) => link.href === "/features"
    )

    if (featuresIndex === -1) {
      return [...navLinks, adminLink]
    }

    return [
      ...navLinks.slice(0, featuresIndex),
      adminLink,
      ...navLinks.slice(featuresIndex),
    ]
  }, [adminLink, effectiveIsAdmin, navLinks])
}

function AuthAwareDesktopNavContent({
  navLinks,
  adminLink,
}: AuthAwareNavProps) {
  const links = useAdminAwareLinks(navLinks, adminLink)

  return <DesktopNav navLinks={links} />
}

function AuthAwareMobileNavContent({ navLinks, adminLink }: AuthAwareNavProps) {
  const links = useAdminAwareLinks(navLinks, adminLink)

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
