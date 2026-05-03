import * as React from "react"
import { DesktopNav } from "@/components/layout/desktop-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { SiteShell } from "@/components/layout/site-shell"
import { Logo } from "@/components/ui/logo"
import { AuthIsland } from "@/components/layout/auth-island"
import { ArticlesLayoutClient } from "./articles-layout-client"
import { getPublicSidebarTree } from "@/lib/articles/public-tree"
import type { ArticleLocale } from "@/lib/article-loader"

const navLinks = [
  { href: "/articles", label: "ARTICLES" },
  { href: "/draft", label: "DRAFTS" },
  { href: "/features", label: "FEATURES" },
]

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
