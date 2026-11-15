import type { ArticleLocale } from "@gtmc/ssg/articles/types"
import * as React from "react"

import { getPublicChapterNav } from "@/lib/articles/public-tree"

import { ArticlesLayoutClient } from "./articles-layout-client"

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

  return <ArticlesLayoutClient tree={tree}>{children}</ArticlesLayoutClient>
}
