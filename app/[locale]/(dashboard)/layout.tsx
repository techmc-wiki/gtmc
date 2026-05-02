import * as React from "react"
import { getTranslations } from "next-intl/server"

import { ProfileButton } from "@/components/ui/profile-button"
import { Logo } from "@/components/ui/logo"
import { MobileNav } from "./mobile-nav"
import { DesktopNav } from "./desktop-nav"
import { SearchCommand } from "@/components/search/search-command"
import { auth } from "@/lib/auth"
import { getCurrentUserAuthContext } from "@/lib/auth-context"
import { LanguageSwitcher } from "@/components/layout/language-switcher"

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
    <div
      className="
        relative flex min-h-screen w-full max-w-full flex-col overflow-x-clip font-sans text-tech-main
        selection:bg-tech-main/20 selection:text-tech-main-dark
      ">
      <nav
        className="
          sticky top-0 z-50 w-full border-b border-tech-main/40 bg-white/60
          backdrop-blur-sm
        ">
        <div className="absolute top-0 left-0 h-px w-full bg-tech-main/20" />
        <div
          className="
            mx-auto max-w-450 px-4
            sm:px-6
            lg:px-8
          ">
          <div
            className="
              flex h-16 items-center justify-between
              md:h-20
            ">
            <div
              className="
                flex space-x-4
                md:space-x-8
              ">
              <Logo size="md" />
              <DesktopNav navLinks={navLinks} />
            </div>

            <div className="flex items-center gap-4">
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
            </div>
          </div>
        </div>
      </nav>

      <main
        className="
           relative w-full max-w-full min-w-0 p-4
          sm:p-6
          lg:px-24 lg:py-8
        ">
        {children}
      </main>
    </div>
  )
}
