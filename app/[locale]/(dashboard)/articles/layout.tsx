import * as React from "react"
import { getSidebarTree } from "@/actions/sidebar"
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

  return <ArticlesLayoutClient tree={tree}>{children}</ArticlesLayoutClient>
}
