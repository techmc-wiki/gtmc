"use client"

import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

interface FooterContextValue {
  hidden: boolean
  registerHide: () => () => void
}

const FooterContext = createContext<FooterContextValue>({
  hidden: false,
  registerHide: () => () => {},
})

export function FooterProvider({ children }: { children: React.ReactNode }) {
  const [hideCount, setHideCount] = useState(0)

  const registerHide = useCallback(() => {
    setHideCount((count) => count + 1)
    return () => {
      setHideCount((count) => Math.max(0, count - 1))
    }
  }, [])

  const value = useMemo(
    () => ({ hidden: hideCount > 0, registerHide }),
    [hideCount, registerHide]
  )

  return (
    <FooterContext.Provider value={value}>{children}</FooterContext.Provider>
  )
}

export function useFooter() {
  return use(FooterContext)
}

/** Registers footer suppression for the subtree lifetime (ref-counted). */
export function HideFooter() {
  const { registerHide } = useFooter()

  useEffect(() => registerHide(), [registerHide])

  return null
}
