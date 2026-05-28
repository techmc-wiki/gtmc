"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/cn"

export interface CategoryFilterCategory {
  name: string
  count: number
}

export interface CategoryFilterProps {
  categories: CategoryFilterCategory[]
  selected: string[]
  onChange: (selected: string[]) => void
  totalCount: number
  className?: string
}

const TRIGGER_BASE =
  "focus-visible:outline-tech-main flex w-full cursor-pointer items-center justify-between gap-3 border px-3 py-2 font-mono text-xs font-bold tracking-widest uppercase transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2"

const TRIGGER_ACTIVE =
  "border-tech-main/60 bg-tech-main/10 text-tech-main-dark hover:bg-tech-main/15"

const TRIGGER_INACTIVE =
  "border-tech-main/40 bg-surface-overlay/70 text-tech-main hover:border-tech-main/60 hover:bg-tech-accent/10"

const ROW_BASE =
  "focus-visible:outline-tech-main group flex w-full cursor-pointer items-center gap-2.5 border px-3 py-2 text-left font-mono text-xs tracking-widest uppercase transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2"

const ROW_ACTIVE = "border-tech-main/60 bg-tech-main/10 text-tech-main-dark"

const ROW_INACTIVE =
  "border-tech-main/30 bg-surface-overlay/50 text-tech-main/80 hover:border-tech-main/60 hover:bg-tech-accent/10"

const PANEL_COLLAPSED = { gridTemplateRows: "0fr", opacity: 0 }
const PANEL_EXPANDED = { gridTemplateRows: "1fr", opacity: 1 }
const PANEL_EASE = [0.32, 0.72, 0, 1] as const

interface RowProps {
  label: string
  count: number
  active: boolean
  name?: string
  onClick?: () => void
  onToggle?: (name: string) => void
}

function Row({ label, count, active, name, onClick, onToggle }: RowProps) {
  const handleClick = React.useCallback(() => {
    if (onClick) onClick()
    else if (onToggle && name) onToggle(name)
  }, [onClick, onToggle, name])

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn(ROW_BASE, active ? ROW_ACTIVE : ROW_INACTIVE)}>
      <span
        aria-hidden="true"
        className={cn(
          "size-2.5 shrink-0 border transition-colors",
          active
            ? "border-tech-main bg-tech-main"
            : "border-tech-main/50 group-hover:border-tech-main bg-transparent"
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={cn(
          "shrink-0",
          active ? "text-tech-main-dark/70" : "text-tech-main/60"
        )}>
        [{count}]
      </span>
    </button>
  )
}

interface ChevronProps {
  open: boolean
}

function Chevron({ open }: ChevronProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn(
        "size-3 shrink-0 transition-transform duration-200",
        open && "rotate-90"
      )}>
      <path
        d="M4 2 L8 6 L4 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  )
}

export function CategoryFilter({
  categories,
  selected,
  onChange,
  totalCount,
  className,
}: CategoryFilterProps) {
  const t = useTranslations("Glossary")
  const allLabel = t("categoryAll")
  const reactId = React.useId()
  const panelId = `${reactId}-panel`
  const reduceMotion = useReducedMotion()
  const panelTransition = React.useMemo(
    () => ({ duration: reduceMotion ? 0 : 0.18, ease: PANEL_EASE }),
    [reduceMotion]
  )

  const [isOpen, setIsOpen] = React.useState(false)
  const noneSelected = selected.length === 0

  const handleToggle = React.useCallback(
    (name: string) => {
      if (selected.includes(name)) {
        onChange(selected.filter((entry) => entry !== name))
      } else {
        onChange([...selected, name])
      }
    },
    [selected, onChange]
  )

  const handleSelectAll = React.useCallback(() => {
    if (selected.length > 0) onChange([])
  }, [selected, onChange])

  const handleTriggerClick = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  // Inline disclosure: Esc closes; outside click does not (would be jarring).
  React.useEffect(() => {
    if (!isOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [isOpen])

  const triggerLabel = noneSelected
    ? `[${allLabel} · ${totalCount}]`
    : `[${t("categoriesSelectedCount", { count: selected.length })}]`

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          TRIGGER_BASE,
          noneSelected ? TRIGGER_INACTIVE : TRIGGER_ACTIVE
        )}>
        <span className="truncate">{triggerLabel}</span>
        <Chevron open={isOpen} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="panel"
            id={panelId}
            initial={PANEL_COLLAPSED}
            animate={PANEL_EXPANDED}
            exit={PANEL_COLLAPSED}
            transition={panelTransition}
            className="grid">
            <div className="overflow-hidden">
              <div className="border-tech-main/30 bg-surface-overlay/60 flex flex-col gap-2 border p-2 backdrop-blur-sm sm:p-3">
                <Row
                  label={allLabel}
                  count={totalCount}
                  active={noneSelected}
                  onClick={handleSelectAll}
                />
                {categories.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {categories.map((category) => (
                      <Row
                        key={category.name}
                        label={category.name}
                        name={category.name}
                        count={category.count}
                        active={selected.includes(category.name)}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
