"use client"

import { useEffect, useRef } from "react"
import type { MachineEvent } from "./types"
import { NAVBAR_HEIGHT } from "./config"

/**
 * Scroll-threshold-crossing detection hook for the mobile article tree state
 * machine.
 *
 * Listens to the window `scroll` event (passive) and dispatches
 * `SCROLL_CROSS_DOWN` / `SCROLL_CROSS_UP` when the scroll position crosses
 * the navbar-height threshold.  On mount it also synchronises an initial
 * crossing event if the page was already scrolled past the threshold.
 *
 * @param isStuck  - Whether the tree is currently in "stuck" mode.
 *                   Used only during the initial sync.
 * @param dispatch - State-machine dispatch function (stable reference from
 *                   `useReducer`).
 */
export function useScrollCrossEffect(
  isStuck: boolean,
  dispatch: (event: MachineEvent) => void,
): void {
  const prevCrossedRef = useRef<boolean | null>(null)

  useEffect(() => {
    const initiallyStuck = window.scrollY > NAVBAR_HEIGHT
    if (initiallyStuck !== isStuck) {
      dispatch({
        type: initiallyStuck ? "SCROLL_CROSS_DOWN" : "SCROLL_CROSS_UP",
      })
    }
    prevCrossedRef.current = initiallyStuck

    const handleScroll = () => {
      const currentlyCrossed = window.scrollY > NAVBAR_HEIGHT
      const prev = prevCrossedRef.current

      if (prev !== null && currentlyCrossed !== prev) {
        dispatch({
          type: currentlyCrossed ? "SCROLL_CROSS_DOWN" : "SCROLL_CROSS_UP",
        })
        prevCrossedRef.current = currentlyCrossed
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
    // isStuck intentionally excluded — only used during mount sync (one-shot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])
}
