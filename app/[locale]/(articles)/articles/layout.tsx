import * as React from "react"
import { getTranslations } from "next-intl/server"
import { getSidebarTree } from "@/actions/sidebar"
import { Logo } from "@/components/ui/logo"
import { SearchCommand } from "@/components/search/search-command"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { Link } from "@/i18n/navigation"
import { DesktopNav } from "../shared/desktop-nav"
import { MobileNav } from "../shared/mobile-nav"
import { ArticlesLayoutClient } from "./articles-layout-client"

export default async function ArticlesLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const tree = await getSidebarTree(locale === "zh" ? "zh" : "en")
  const t = await getTranslations("Nav")

  const navLinks = [
    { href: "/articles", label: t("articles") },
    { href: "/draft", label: t("drafts") },
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
              <Link
                href="/login"
                className="
                  flex h-8 items-center justify-center border border-tech-main/40 bg-tech-main/10 px-3 font-mono text-[0.625rem]
                  font-bold tracking-widest text-tech-main uppercase transition-all
                  duration-300 hover:bg-tech-main hover:text-white
                  md:text-xs
                ">
                LOGIN
              </Link>
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
        <ArticlesLayoutClient tree={tree}>{children}</ArticlesLayoutClient>
      </main>
    </div>
  )
}
