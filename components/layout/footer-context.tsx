"use client"

import { createContext, useContext, useEffect, useState } from "react"

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

  return (
    <FooterContext.Provider value={{ hidden, setHidden }}>
      {children}
    </FooterContext.Provider>
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
