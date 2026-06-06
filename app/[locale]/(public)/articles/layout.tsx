import * as React from "react"
import { MainSiteShell } from "@/components/layout/main-site-shell"
import { ArticlesLayoutClient } from "./articles-layout-client"
import { getPublicChapterNav } from "@/lib/articles/public-tree"
import type { ArticleLocale } from "@/lib/articles/manifest"

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
  const tree = await getPublicChapterNav(normalizedLocale)

  return (
    <MainSiteShell>
      <ArticlesLayoutClient tree={tree}>{children}</ArticlesLayoutClient>
    </MainSiteShell>
  )
}
