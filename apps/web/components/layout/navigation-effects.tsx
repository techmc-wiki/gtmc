import type { ReactNode } from "react"
import { SITE_SCROLL_ROOT_ID } from "@/hooks/site-scroll-root"

export function ScrollRoot({ children }: { children: ReactNode }) {
  return (
    <div
      id={SITE_SCROLL_ROOT_ID}
      className="h-dvh min-h-0 w-full scroll-pt-16 overflow-x-hidden overflow-y-auto [scroll-timeline:--site-scroll_block] motion-safe:scroll-smooth md:scroll-pt-20">
      <div className="flex min-h-full flex-col">{children}</div>
    </div>
  )
}
