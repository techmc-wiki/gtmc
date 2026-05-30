import React from "react"

export type StatusNotificationKind = "info" | "error" | "progress"

export interface StatusNotificationState {
  message: string
  type: StatusNotificationKind
}

export function useStatusNotification() {
  const [badge, setBadge] = React.useState<StatusNotificationState | null>(null)
  const badgeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const showBadge = (
    message: string,
    type: StatusNotificationKind,
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

  React.useEffect(
    () => () => {
      if (badgeTimeoutRef.current) {
        clearTimeout(badgeTimeoutRef.current)
      }
    },
    []
  )

  return { badge, showBadge, clearBadge }
}
