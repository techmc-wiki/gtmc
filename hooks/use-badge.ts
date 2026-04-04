import React from "react"

export type BadgeType = "info" | "error" | "progress"

export interface BadgeState {
  message: string
  type: BadgeType
}

export function useBadge() {
  const [badge, setBadge] = React.useState<BadgeState | null>(null)
  const badgeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const showBadge = (
    message: string,
    type: BadgeType,
    autoClearMs?: number
  ) => {
    if (badgeTimeoutRef.current) {
      clearTimeout(badgeTimeoutRef.current)
    }

    setBadge({ message, type })

    if (autoClearMs) {
      badgeTimeoutRef.current = setTimeout(() => {
        setBadge(null)
      }, autoClearMs)
    }
  }

  const clearBadge = () => {
    if (badgeTimeoutRef.current) {
      clearTimeout(badgeTimeoutRef.current)
    }

    setBadge(null)
  }

  React.useEffect(() => {
    return () => {
      if (badgeTimeoutRef.current) {
        clearTimeout(badgeTimeoutRef.current)
      }
    }
  }, [])

  return { badge, showBadge, clearBadge }
}
