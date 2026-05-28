"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useTheme } from "@/lib/theme"
import { THEME_COOKIE } from "@/lib/theme/cookie"
import { cn } from "@/lib/cn"

type Mode = "light" | "dark" | "system"

const CYCLE_ORDER: readonly Mode[] = ["system", "light", "dark"] as const

const TOGGLE_LABEL_KEY: Record<
  Mode,
  "toggleLight" | "toggleDark" | "toggleSystem"
> = {
  light: "toggleLight",
  dark: "toggleDark",
  system: "toggleSystem",
}

const MENU_LABEL_KEY: Record<Mode, "labelLight" | "labelDark" | "labelSystem"> =
  {
    light: "labelLight",
    dark: "labelDark",
    system: "labelSystem",
  }

const MENU_CLOSE_DELAY_MS = 180
const LONG_PRESS_MS = 500

function readModeFromCookie(): Mode {
  if (typeof document === "undefined") return "system"
  const match = document.cookie.match(/(?:^|;\s*)theme=(light|dark)/)
  if (match) return match[1] as "light" | "dark"
  return "system"
}

function clearThemeCookie() {
  if (typeof document === "undefined") return
  document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

interface IconProps {
  className?: string
}

// Inline Lucide icon paths (Sun / Moon / Monitor).
// Matches lucide-react v0 visual output. ISC-licensed paths.
function SunIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function MoonIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MonitorIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  )
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function ModeIcon({ mode, className }: { mode: Mode; className?: string }) {
  if (mode === "light") return <SunIcon className={className} />
  if (mode === "dark") return <MoonIcon className={className} />
  return <MonitorIcon className={className} />
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("Theme")
  const { resolvedTheme, setTheme } = useTheme()
  const [mode, setMode] = React.useState<Mode>("system")
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const longPressTriggeredRef = React.useRef(false)

  React.useEffect(() => {
    setMode(readModeFromCookie())
  }, [])

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const clearLongPressTimer = React.useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  React.useEffect(
    () => () => {
      clearCloseTimer()
      clearLongPressTimer()
    },
    [clearCloseTimer, clearLongPressTimer]
  )

  const openMenu = React.useCallback(() => {
    clearCloseTimer()
    setIsMenuOpen(true)
  }, [clearCloseTimer])

  const scheduleCloseMenu = React.useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => {
      setIsMenuOpen(false)
      closeTimerRef.current = null
    }, MENU_CLOSE_DELAY_MS)
  }, [clearCloseTimer])

  const applyMode = React.useCallback(
    (next: Mode) => {
      setMode(next)
      if (next === "system") {
        // Use the provider's resolvedTheme (which already tracks system pref)
        // then clear the cookie so next reload falls back to prefers-color-scheme.
        setTheme(resolvedTheme)
        clearThemeCookie()
      } else {
        setTheme(next)
      }
    },
    [setTheme, resolvedTheme]
  )

  const onClickToggle = React.useCallback(() => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }
    const idx = CYCLE_ORDER.indexOf(mode)
    const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length]
    applyMode(next)
  }, [mode, applyMode])

  const onContextMenu = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      openMenu()
    },
    [openMenu]
  )

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === "mouse") return
      clearLongPressTimer()
      longPressTriggeredRef.current = false
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true
        openMenu()
      }, LONG_PRESS_MS)
    },
    [openMenu, clearLongPressTimer]
  )

  const onPointerEnd = React.useCallback(() => {
    clearLongPressTimer()
  }, [clearLongPressTimer])

  const onMenuItemClick = React.useCallback(
    (next: Mode) => {
      applyMode(next)
      setIsMenuOpen(false)
    },
    [applyMode]
  )

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape" && isMenuOpen) {
        event.stopPropagation()
        setIsMenuOpen(false)
      }
    },
    [isMenuOpen]
  )

  const displayedMode: Mode = mode === "system" ? "system" : mode
  const displayedIcon: Mode = mode === "system" ? resolvedTheme : mode
  const toggleAriaLabel = t(TOGGLE_LABEL_KEY[displayedMode])

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleCloseMenu}
      onFocus={openMenu}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          scheduleCloseMenu()
        }
      }}>
      <button
        type="button"
        onClick={onClickToggle}
        onContextMenu={onContextMenu}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerEnd}
        onPointerLeave={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
        aria-label={toggleAriaLabel}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        title={toggleAriaLabel}
        className="border-tech-main/40 bg-tech-main/10 text-tech-main hover:bg-tech-main flex size-8 cursor-pointer items-center justify-center border transition-all duration-300 hover:text-white md:size-10">
        <ModeIcon mode={displayedIcon} className="size-4" />
      </button>

      <div
        role="menu"
        aria-label={t("labelSystem")}
        className={cn(
          "pointer-events-none absolute top-full right-0 z-50 w-56 origin-top-right pt-2 opacity-0 transition-all duration-200",
          isMenuOpen && "pointer-events-auto opacity-100"
        )}>
        <div className="border-tech-main/30 bg-surface-overlay/95 border p-1 shadow-lg backdrop-blur-sm">
          {CYCLE_ORDER.map((option) => {
            const isActive = option === mode
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => onMenuItemClick(option)}
                className={cn(
                  "flex w-full items-center gap-2 px-2 py-1.5 text-left font-mono text-[0.625rem] tracking-widest uppercase transition-colors",
                  isActive
                    ? "bg-tech-main/15 text-tech-main-dark"
                    : "text-tech-main-dark hover:bg-tech-main/10"
                )}>
                <ModeIcon mode={option} className="size-3.5 shrink-0" />
                <span className="flex-1 truncate">
                  {t(MENU_LABEL_KEY[option])}
                </span>
                <span
                  className={cn(
                    "size-3 shrink-0",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden="true">
                  <CheckIcon className="size-3" />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
