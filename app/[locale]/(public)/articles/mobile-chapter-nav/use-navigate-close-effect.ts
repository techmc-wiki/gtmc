"use client"

/**
 * Navigation effect hook for the mobile article tree state machine.
 *
 * Listens to client-side route changes and dispatches a `NAVIGATE` event so
 * the state machine transitions back to `closed`.  This covers browser
 * back/forward navigation in addition to explicit link clicks.
 *
 * @module mobile-chapter-nav/use-navigate-close-effect
 */

import { useEffect, useRef } from "react"
import { usePathname } from "@/i18n/navigation"
import type { MachineEvent } from "./types"

/**
 * Subscribe to pathname changes and dispatch `NAVIGATE` when the user
 * navigates to a different article route.
 *
 * The initial mount render is intentionally skipped — the tree should not be
 * closed automatically on first load.
 *
 * @param dispatch - State machine dispatch function.
 */
export function useNavigateCloseEffect(
  dispatch: (event: MachineEvent) => void
): void {
  const pathname = usePathname()
  const prevPathnameRef = useRef<string | null>(null)

  useEffect(() => {
    if (prevPathnameRef.current === null) {
      // Skip initial mount — don't dispatch on first render
      prevPathnameRef.current = pathname
      return
    }

    if (pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = pathname
      dispatch({ type: "NAVIGATE" })
    }
  }, [pathname, dispatch])
}
