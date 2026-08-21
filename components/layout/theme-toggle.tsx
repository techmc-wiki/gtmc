"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useMounted } from "@/hooks/use-mounted"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/cn"
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu"

type Mode = "light" | "dark" | "system"

const MODES: readonly Mode[] = ["light", "dark", "system"]

const MENU_LABEL_KEY: Record<Mode, "labelLight" | "labelDark" | "labelSystem"> =
  {
    light: "labelLight",
    dark: "labelDark",
    system: "labelSystem",
  }

function ModeIcon({ mode, className }: { mode: Mode; className?: string }) {
  if (mode === "light") return <SunIcon className={className} />
  if (mode === "dark") return <MoonIcon className={className} />
  return <MonitorIcon className={className} />
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("Theme")
  const { theme, resolvedTheme, setTheme } = useTheme()
  const isMounted = useMounted()

  const effectiveMode: Mode = isMounted ? theme : "system"
  const resolvedIsDark = isMounted && resolvedTheme === "dark"
  const toggleAriaLabel = t(
    effectiveMode === "light"
      ? "toggleLight"
      : effectiveMode === "dark"
        ? "toggleDark"
        : "toggleSystem"
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={toggleAriaLabel}
          title={toggleAriaLabel}
          className={cn(
            "hover:bg-tech-main/10 hover:text-tech-main-dark hover:no-underline md:size-10",
            className
          )}>
          {isMounted ? (
            resolvedIsDark ? (
              <MoonIcon className="size-4" />
            ) : (
              <SunIcon className="size-4" />
            )
          ) : (
            <MoonIcon className="size-4 opacity-0" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="border-tech-main/30 bg-surface-overlay/95 w-44 border p-1 shadow-lg backdrop-blur-sm">
        <DropdownMenuRadioGroup
          value={effectiveMode}
          onValueChange={(value) => setTheme(value as Mode)}>
          {MODES.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              className="text-tech-main-dark focus:bg-tech-main/10 focus:text-tech-main-dark cursor-pointer gap-2 rounded-none py-1.5 pr-2 pl-8">
              <ModeIcon mode={option} className="size-3.5 shrink-0" />
              <span className="flex-1">{t(MENU_LABEL_KEY[option])}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
