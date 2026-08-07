"use client"

import * as React from "react"

interface HoverMenuState {
  isOpen: boolean
  open: () => void
  close: () => void
  scheduleClose: () => void
  cancelClose: () => void
  toggle: () => void
}

export function useHoverMenu(closeDelayMs: number): HoverMenuState {
  const [isOpen, setIsOpen] = React.useState(false)
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const open = React.useCallback(() => {
    cancelClose()
    setIsOpen(true)
  }, [cancelClose])

  const close = React.useCallback(() => {
    cancelClose()
    setIsOpen(false)
  }, [cancelClose])

  const scheduleClose = React.useCallback(() => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
      closeTimerRef.current = null
    }, closeDelayMs)
  }, [cancelClose, closeDelayMs])

  const toggle = React.useCallback(() => {
    cancelClose()
    setIsOpen((currentOpen) => !currentOpen)
  }, [cancelClose])

  React.useEffect(() => cancelClose, [cancelClose])

  return { isOpen, open, close, scheduleClose, cancelClose, toggle }
}
