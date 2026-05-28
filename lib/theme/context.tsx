"use client"

import { usePathname } from "next/navigation"
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { parseThemeCookie, serializeThemeCookie } from "./cookie"
import type { ResolvedTheme, Theme } from "./types"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light"
  const fromCookie = parseThemeCookie(document.cookie)
  return fromCookie ?? "system"
}

function readInitialResolvedTheme(): ResolvedTheme {
  if (typeof document === "undefined") return "light"
  const attr = document.documentElement.getAttribute("data-theme")
  if (attr === "light" || attr === "dark") return attr
  return getSystemTheme()
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    readInitialResolvedTheme
  )
  const hasExplicitChoice = useRef(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    hasExplicitChoice.current = parseThemeCookie(document.cookie) !== null
  }, [])

  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme
    setResolvedTheme(resolved)
    document.documentElement.setAttribute("data-theme", resolved)
  }, [pathname, theme])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      if (hasExplicitChoice.current) return
      const resolved: ResolvedTheme = mediaQuery.matches ? "dark" : "light"
      setResolvedTheme(resolved)
      document.documentElement.setAttribute("data-theme", resolved)
    }
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  const setTheme = useCallback((newTheme: Theme) => {
    if (newTheme === "system") {
      hasExplicitChoice.current = false
      setThemeState("system")
      const systemTheme = getSystemTheme()
      setResolvedTheme(systemTheme)
      document.documentElement.setAttribute("data-theme", systemTheme)
      document.cookie = serializeThemeCookie("system")
    } else {
      hasExplicitChoice.current = true
      setThemeState(newTheme)
      startTransition(() => {
        setResolvedTheme(newTheme)
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
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
