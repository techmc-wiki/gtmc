"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useMounted } from "@/hooks/use-mounted"
import { useTheme } from "@/lib/theme"
import { parseThemeCookie } from "@/lib/theme/cookie"
import { cn } from "@/lib/cn"
import {
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "@/components/ui/icons"

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
  return parseThemeCookie(document.cookie) ?? "system"
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
  const isMounted = useMounted()
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const longPressTriggeredRef = React.useRef(false)

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

  React.useEffect(() => {
    setMode(readModeFromCookie())
  }, [])

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
      setTheme(next)
    },
    [setTheme]
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
  const displayedIcon: Mode = isMounted
    ? mode === "system"
      ? resolvedTheme
      : mode
    : "system"
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
        className="border-tech-main/40 bg-tech-main/10 text-tech-main hover:bg-tech-main-dark hover:text-tech-bg flex size-8 cursor-pointer items-center justify-center border transition-all duration-300 md:size-10">
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
