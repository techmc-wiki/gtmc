"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

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
