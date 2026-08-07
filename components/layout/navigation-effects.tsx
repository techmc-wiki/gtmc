"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { usePathname as useLocalePathname } from "@/i18n/navigation"
import { SITE_SCROLL_ROOT_ID } from "@/hooks/site-scroll-root"

/**
 * Replays the enter animation on client-side navigation without making the
 * page subtree dynamic: `usePathname` suspends during prerender, so it must
 * stay inside its own Suspense boundary, away from `children`.
 */
function ReplayOnNavigate({
  target,
}: {
  target: React.RefObject<HTMLDivElement | null>
}) {
  const pathname = usePathname()
  const isFirstRender = React.useRef(true)

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const el = target.current
    if (!el) return
    el.classList.remove("animate-page-enter")
    // Force reflow so removing/re-adding the class restarts the animation.
    void el.offsetWidth
    el.classList.add("animate-page-enter")
  }, [pathname, target])

  return null
}

/** Replays the enter animation on client-side navigation. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      className="animate-page-enter w-full motion-reduce:animate-none">
      <React.Suspense fallback={null}>
        <ReplayOnNavigate target={ref} />
      </React.Suspense>
      {children}
    </div>
  )
}

/**
 * Site scroll container that resets to the top on navigation (including the
 * initial mount), using the locale-aware pathname.
 */
function ScrollResetOnNavigate({
  rootRef,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>
}) {
  const pathname = useLocalePathname()

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
