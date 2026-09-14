"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

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

export interface DensityToggleProps {
  value: GlossaryDensity
  onChange: (density: GlossaryDensity) => void
  className?: string
}

export function DensityToggle({
  value,
  onChange,
  className,
}: DensityToggleProps) {
  const t = useTranslations("Glossary")
  const groupName = React.useId()
  const barRef = React.useRef<HTMLFieldSetElement>(null)
  const pillRef = React.useRef<HTMLSpanElement>(null)
  const valueRef = React.useRef(value)
  const positionedRef = React.useRef(false)

  const moveTo = React.useCallback(
    (density: GlossaryDensity, animate: boolean) => {
      const pill = pillRef.current
      const tab = barRef.current?.querySelector<HTMLLabelElement>(
        `.t-tab[data-density="${density}"]`
      )
      if (!pill || !tab) return
      const previous = pill.style.transition
      if (!animate) pill.style.transition = "none"
      pill.style.transform = `translateX(${tab.offsetLeft}px)`
      pill.style.width = `${tab.offsetWidth}px`
      if (!animate) {
        void pill.offsetWidth
        pill.style.transition = previous
      }
    },
    []
  )

  React.useLayoutEffect(() => {
    valueRef.current = value
    moveTo(value, positionedRef.current)
    positionedRef.current = true
  }, [value, moveTo])

  React.useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const observer = new ResizeObserver(() => moveTo(valueRef.current, false))
    observer.observe(bar)
    bar.querySelectorAll(".t-tab").forEach((tab) => observer.observe(tab))
    return () => observer.disconnect()
  }, [moveTo])

  return (
    <fieldset
      ref={barRef}
      className={cn("t-tabs t-tabs--density min-w-0 max-w-full", className)}>
      <legend className="sr-only">
        {t("densityIconLabel", { density: t(DENSITY_LABEL_KEYS[value]) })}
      </legend>
      <span ref={pillRef} aria-hidden="true" className="t-tabs-pill" />
      {GLOSSARY_DENSITIES.map((density) => (
        <label
          key={density}
          data-density={density}
          className="t-tab flex items-center justify-center">
          <input
            type="radio"
            name={groupName}
            value={density}
            checked={density === value}
            onChange={() => onChange(density)}
            className="sr-only"
          />
          {t(DENSITY_LABEL_KEYS[density])}
        </label>
      ))}
    </fieldset>
  )
}
