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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/shadcn/dropdown-menu"

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
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const longPressTriggeredRef = React.useRef(false)

  const clearLongPressTimer = React.useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  React.useEffect(
    () => () => {
      clearLongPressTimer()
    },
    [clearLongPressTimer]
  )

  React.useEffect(() => {
    setMode(readModeFromCookie())
  }, [])

  const openMenu = React.useCallback(() => setIsMenuOpen(true), [])

  const applyMode = React.useCallback(
    (next: Mode) => {
      setMode(next)
      setTheme(next)
    },
    [setTheme]
  )

  const onClickToggle = React.useCallback(
    (event: React.MouseEvent) => {
      // preventDefault keeps the Radix trigger from toggling the menu:
      // plain clicks cycle the theme instead.
      event.preventDefault()
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false
        return
      }
      const idx = CYCLE_ORDER.indexOf(mode)
      const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length]
      applyMode(next)
    },
    [mode, applyMode]
  )

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

  const displayedMode: Mode = mode === "system" ? "system" : mode
  const displayedIcon: Mode = isMounted
    ? mode === "system"
      ? resolvedTheme
      : mode
    : "system"
  const toggleAriaLabel = t(TOGGLE_LABEL_KEY[displayedMode])

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={onClickToggle}
          onContextMenu={onContextMenu}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerEnd}
          onPointerLeave={onPointerEnd}
          onPointerCancel={onPointerEnd}
          aria-label={toggleAriaLabel}
          title={toggleAriaLabel}
          className={cn(
            "border-tech-main/40 bg-tech-main/10 text-tech-main hover:bg-tech-main-dark hover:text-tech-bg flex size-8 cursor-pointer items-center justify-center border transition-all duration-300 md:size-10",
            className
          )}>
          <ModeIcon mode={displayedIcon} className="size-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        aria-label={t("labelSystem")}
        className="border-tech-main/30 bg-surface-overlay/95 w-56 border p-1 shadow-lg backdrop-blur-sm">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => applyMode(value as Mode)}>
          {CYCLE_ORDER.map((option) => {
            const isActive = option === mode
            return (
              <DropdownMenuRadioItem
                key={option}
                value={option}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-none py-1.5 pr-2 pl-2 font-mono text-[0.625rem] tracking-widest uppercase transition-colors [&>span:first-child]:hidden",
                  isActive
                    ? "bg-tech-main/15 text-tech-main-dark"
                    : "text-tech-main-dark hover:bg-tech-main/10 focus:bg-tech-main/10 focus:text-tech-main-dark"
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
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
