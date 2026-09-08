"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import { cn } from "@/lib/cn"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/shadcn/collapsible"

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
    <Button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      variant="ghost"
      className={cn(
        "w-full justify-start whitespace-normal text-left",
        active && "bg-accent"
      )}>
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
        {count}
      </span>
    </Button>
  )
}

function Chevron({ open }: { open: boolean }) {
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

  const [isOpen, setIsOpen] = React.useState(false)
  const noneSelected = selected.length === 0
  const selectedSet = React.useMemo(() => new Set(selected), [selected])

  const handleToggle = React.useCallback(
    (name: string) => {
      if (selectedSet.has(name)) {
        onChange(selected.filter((entry) => entry !== name))
      } else {
        onChange([...selected, name])
      }
    },
    [selectedSet, selected, onChange]
  )

  const handleSelectAll = React.useCallback(() => {
    if (selected.length > 0) onChange([])
  }, [selected, onChange])

  const triggerLabel = noneSelected
    ? `${allLabel} · ${totalCount}`
    : t("categoriesSelectedCount", { count: selected.length })

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("flex flex-col gap-2", className)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setIsOpen(false)
      }}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between">
          <span className="truncate">{triggerLabel}</span>
          <Chevron open={isOpen} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="overflow-hidden">
          <div id={panelId} className="flex flex-col gap-2 py-2">
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
                    active={selectedSet.has(category.name)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
