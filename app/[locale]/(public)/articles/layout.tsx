import * as React from "react"
import { getTranslations } from "next-intl/server"
import { DesktopNav } from "@/components/layout/desktop-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { SiteShell } from "@/components/layout/site-shell"
import { Logo } from "@/components/ui/logo"
import { AuthIsland } from "@/components/layout/auth-island"
import { ArticlesLayoutClient } from "./articles-layout-client"
import { getPublicSidebarTree } from "@/lib/articles/public-tree"
import type { ArticleLocale } from "@/lib/article-loader"

function normalizeLocale(locale: string): ArticleLocale {
  return locale === "en" ? "en" : "zh"
}

export default async function ArticlesLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations("Nav")
  const navLinks = [
    { href: "/articles", label: t("articles") },
    { href: "/draft", label: t("drafts") },
    { href: "/features", label: t("features") },
  ]
  const normalizedLocale = normalizeLocale(locale)
  const tree = await getPublicSidebarTree(normalizedLocale)

  return (
    <SiteShell
      leftSlot={
        <>
          <Logo size="md" />
          <DesktopNav navLinks={navLinks} />
          <MobileNav navLinks={navLinks} />
        </>
      }
      rightSlot={<AuthIsland />}>
      <ArticlesLayoutClient tree={tree}>{children}</ArticlesLayoutClient>
    </SiteShell>
  )
}
