import * as React from "react"
import { ArticlesLayoutClient } from "./articles-layout-client"

export default function ArticlesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ArticlesLayoutClient tree={[]}>{children}</ArticlesLayoutClient>
}
