"use client"

import { useReducer } from "react"
import { transition, createInitialState } from "./reducer"
import { useNavigateCloseEffect } from "./use-navigate-close-effect"
import { useResizeToDesktopEffect } from "./use-resize-to-desktop-effect"
import { useScrollCrossEffect } from "./use-scroll-cross-effect"

export function useMobileChapterNavMachine() {
  const [state, dispatch] = useReducer(transition, undefined, () =>
    createInitialState(false)
  )

  useScrollCrossEffect(state.isStuck, dispatch)
  useNavigateCloseEffect(dispatch)
  useResizeToDesktopEffect(dispatch)

  const isOpen = state.value !== "closed"
  const isFloating = state.value === "floating_open"

  return { state, dispatch, isOpen, isFloating, isStuck: state.isStuck }
}
