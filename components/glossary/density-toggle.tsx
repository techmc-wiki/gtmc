"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/shadcn/button"
import { cn } from "@/lib/cn"
import {
  GLOSSARY_DENSITIES,
  type GlossaryDensity,
} from "@/lib/glossary/view-options"
const DENSITY_LABEL_KEYS = {
  compact: "densityCompact",
  normal: "densityNormal",
  comfortable: "densityComfortable",
} as const satisfies Record<GlossaryDensity, string>
const ACTIVE_ROWS = {
  compact: [0, 1, 2, 3],
  normal: [0, 1, 3],
  comfortable: [0, 3],
} as const satisfies Record<GlossaryDensity, readonly number[]>

export interface DensityToggleProps {
  value: GlossaryDensity
  onChange: (density: GlossaryDensity) => void
  className?: string
}

function getNextDensity(value: GlossaryDensity): GlossaryDensity {
  const index = GLOSSARY_DENSITIES.indexOf(value)
  return GLOSSARY_DENSITIES[(index + 1) % GLOSSARY_DENSITIES.length]
}

function DensityIcon({ variant }: { variant: GlossaryDensity }) {
  const activeRows = ACTIVE_ROWS[variant]
  const gap =
    variant === "compact"
      ? "gap-0.5"
      : variant === "normal"
        ? "gap-1"
        : "gap-[5px]"

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid w-4 py-0.5 transition-[gap,transform] duration-300 ease-out",
        gap
      )}>
      {[0, 1, 2, 3].map((row) => {
        const active = (activeRows as readonly number[]).includes(row)
        return (
          <span
            key={row}
            className={cn(
              "grid h-[3px] grid-cols-[3px_1fr] items-center gap-1 overflow-hidden transition-[opacity,transform] duration-300 ease-out",
              active ? "opacity-100" : "scale-x-75 opacity-10"
            )}>
            <span className="size-[3px] border border-current/60 bg-current/15" />
            <span className="h-[3px] border border-current/50 bg-current/10" />
          </span>
        )
      })}
    </span>
  )
}

export function DensityToggle({
  value,
  onChange,
  className,
}: DensityToggleProps) {
  const t = useTranslations("Glossary")

  const nextDensity = getNextDensity(value)
  const currentLabel = t(DENSITY_LABEL_KEYS[value])
  const nextLabel = t(DENSITY_LABEL_KEYS[nextDensity])
  const buttonLabel = t("densityCycleLabel", {
    density: currentLabel,
    nextDensity: nextLabel,
  })

  const handleClick = React.useCallback(() => {
    onChange(nextDensity)
  }, [nextDensity, onChange])

  return (
    <Button
      type="button"
      aria-label={buttonLabel}
      title={buttonLabel}
      onClick={handleClick}
      data-density={value}
      variant="outline"
      size="icon"
      className={className}>
      <DensityIcon variant={value} />
      <span className="sr-only" aria-live="polite">
        {currentLabel}
      </span>
    </Button>
  )
}
