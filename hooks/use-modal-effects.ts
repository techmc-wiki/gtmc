"use client"

import { useEffect } from "react"

interface UseModalEffectsOptions {
  isOpen: boolean
  onClose: () => void
}

export function useModalEffects({ isOpen, onClose }: UseModalEffectsOptions) {
  useEffect(() => {
    if (!isOpen) return

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
  }, [isOpen, onClose])
}
