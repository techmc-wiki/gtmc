"use client"

import { usePathname } from "next/navigation"
import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react"
import { parseThemeCookie, serializeThemeCookie } from "./cookie"
import {
  getSystemThemeServerSnapshot,
  getSystemThemeSnapshot,
  subscribeSystemTheme,
} from "./system-theme"
import type { ResolvedTheme, Theme } from "./types"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light"
  const fromCookie = parseThemeCookie(document.cookie)
  return fromCookie ?? "system"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)
  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemThemeSnapshot,
    getSystemThemeServerSnapshot
  )
  const resolvedTheme = useMemo(
    (): ResolvedTheme => (theme === "system" ? systemTheme : theme),
    [theme, systemTheme]
  )
  const [, startTransition] = useTransition()

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme)
  }, [pathname, resolvedTheme])

  const setTheme = useCallback((newTheme: Theme) => {
    if (newTheme === "system") {
      setThemeState("system")
      document.cookie = serializeThemeCookie("system")
    } else {
      setThemeState(newTheme)
      startTransition(() => {
        document.documentElement.setAttribute("data-theme", newTheme)
        document.cookie = serializeThemeCookie(newTheme)
      })
    }
  }, [])

  const contextValue = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
