"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { CornerBrackets } from "@/components/ui/corner-brackets"

interface MobileTreeCardProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  isFloating?: boolean
}

export function MobileTreeCard({
  isOpen,
  onClose,
  children,
  isFloating,
}: MobileTreeCardProps) {
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    if (!isOpen || !isFloating) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = previousOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose])

  if (!isMounted || !isOpen || !isFloating) return null

  return createPortal(
    <div
      className="
        fixed inset-0 z-59
        md:hidden
      ">
      <div
        className="
          absolute inset-0 animate-fade-in bg-tech-main-dark/20 backdrop-blur-xs
        "
        onClick={onClose}
        data-testid="mobile-tree-card-backdrop"
        aria-hidden="true"
      />

      <div
        className="
          absolute top-1/2 left-1/2 z-60 flex max-h-[calc(100dvh-6rem)]
          w-[calc(100dvw-4rem)] max-w-[24rem] -translate-1/2 animate-tech-pop-in
          flex-col border border-tech-main/40 bg-white/95 backdrop-blur-md
        "
        data-testid="mobile-tree-card">
        <CornerBrackets />

        <div
          className="
            z-20 flex h-10/12 shrink-0 items-center justify-between border-b
            border-tech-main/40 px-4
          "
          data-testid="mobile-tree-card-header">
          <div
            className="
              flex items-center gap-2 font-mono text-xs font-bold
              tracking-tech-wide text-tech-main/60 uppercase
            ">
            <span className="size-1.5 animate-pulse bg-tech-main/60" />
            SYS.DIR_TREE
          </div>
          <button
            onClick={onClose}
            className="
              cursor-pointer px-3 py-2 font-mono text-xs font-bold
              tracking-[0.15em] text-tech-main uppercase transition-colors
              hover:bg-tech-main/10
            "
            data-testid="mobile-tree-card-close"
            aria-label="Close tree">
            CLOSE
          </button>
        </div>

        <div
          className="
            min-h-0 overflow-y-auto p-4
            sm:p-6
          ">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
