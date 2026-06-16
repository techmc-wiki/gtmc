"use client"

import * as React from "react"
import { usePathname } from "@/i18n/navigation"
import { SITE_SCROLL_ROOT_ID } from "@/hooks/site-scroll-root"

export function ScrollRoot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    rootRef.current?.scrollTo({ left: 0, top: 0 })
  }, [pathname])

  return (
    <div
      ref={rootRef}
      id={SITE_SCROLL_ROOT_ID}
      className="h-dvh min-h-0 w-full overflow-x-hidden overflow-y-auto scroll-smooth">
      <div className="flex min-h-full flex-col">{children}</div>
    </div>
  )
}
