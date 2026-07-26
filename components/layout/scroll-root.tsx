"use client"

import * as React from "react"
import { usePathname } from "@/i18n/navigation"
import { SITE_SCROLL_ROOT_ID } from "@/hooks/site-scroll-root"

function ScrollResetOnNavigate({
  rootRef,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>
}) {
  const pathname = usePathname()

  React.useEffect(() => {
    rootRef.current?.scrollTo({ left: 0, top: 0 })
  }, [pathname, rootRef])

  return null
}

export function ScrollRoot({ children }: { children: React.ReactNode }) {
  const rootRef = React.useRef<HTMLDivElement>(null)

  return (
    <div
      ref={rootRef}
      id={SITE_SCROLL_ROOT_ID}
      className="h-dvh min-h-0 w-full overflow-x-hidden overflow-y-auto scroll-smooth [scroll-timeline:--site-scroll_block]">
      <React.Suspense fallback={null}>
        <ScrollResetOnNavigate rootRef={rootRef} />
      </React.Suspense>
      <div className="flex min-h-full flex-col">{children}</div>
    </div>
  )
}
