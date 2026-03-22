import * as React from "react"
import { getSidebarTree } from "@/actions/sidebar"
import { ArticlesLayoutClient } from "./articles-layout-client"

export default async function ArticlesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tree = await getSidebarTree()

  return <ArticlesLayoutClient tree={tree}>{children}</ArticlesLayoutClient>
}
