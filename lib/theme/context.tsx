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

function applyDocumentTheme(theme: Theme): void {
  const resolvedTheme = theme === "system" ? getSystemThemeSnapshot() : theme
  const root = document.documentElement

  if (root.dataset.theme !== resolvedTheme) {
    root.setAttribute("data-theme", resolvedTheme)
  }
}

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
  const resolvedTheme = theme === "system" ? systemTheme : theme
  useEffect(() => {
    applyDocumentTheme(theme)
  }, [pathname, systemTheme, theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    applyDocumentTheme(newTheme)
    document.cookie = serializeThemeCookie(newTheme)
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
