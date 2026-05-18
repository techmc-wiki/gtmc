"use client"

import { useEffect } from "react"
import type { MachineEvent } from "./types"
import { DESKTOP_MEDIA_QUERY } from "./config"

/**
 * Resize-to-desktop detection hook for the mobile article tree state machine.
 *
 * Listens for viewport resize events via `window.matchMedia` and dispatches a
 * `RESIZE_TO_DESKTOP` event when the viewport crosses **into** the desktop
 * breakpoint.  No event is dispatched on the initial evaluation — only on
 * subsequent transitions.
 *
 * The inverse direction (desktop → mobile) is intentionally not handled: the
 * machine starts `closed`, so no action is needed.
 *
 * @param dispatch - State-machine dispatch function (stable reference from
 *                   `useReducer`).
 */
export function useResizeToDesktopEffect(
  dispatch: (event: MachineEvent) => void,
): void {
  useEffect(() => {
    if (typeof window === "undefined") return

    const mq = window.matchMedia(DESKTOP_MEDIA_QUERY)

    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        dispatch({ type: "RESIZE_TO_DESKTOP" })
      }
    }

    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [dispatch])
}
