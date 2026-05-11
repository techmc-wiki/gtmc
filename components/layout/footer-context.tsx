"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

interface FooterContextValue {
  hidden: boolean
  setHidden: (hidden: boolean) => void
}

const FooterContext = createContext<FooterContextValue>({
  hidden: false,
  setHidden: () => {},
})

export function FooterProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false)

  const value = useMemo(() => ({ hidden, setHidden }), [hidden])

  return (
    <FooterContext.Provider value={value}>{children}</FooterContext.Provider>
  )
}

export function useFooter() {
  return useContext(FooterContext)
}

export function HideFooter() {
  const { setHidden } = useFooter()

  useEffect(() => {
    setHidden(true)
    return () => setHidden(false)
  }, [setHidden])

  return null
}
