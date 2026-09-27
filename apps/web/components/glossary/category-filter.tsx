"use client"

import * as React from "react"
import { ChevronDown, ListFilter } from "lucide-react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/shadcn/badge"
import { Button } from "@/components/ui/shadcn/button"
import { cn } from "@/lib/cn"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/shadcn/popover"

export interface GlossaryCategoryOption {
  name: string
  count: number
}

export interface CategoryFacetProps {
  categories: GlossaryCategoryOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  className?: string
}

interface CategoryRowProps {
  label: string
  count: number
  active: boolean
  name: string
  onToggle: (name: string) => void
}

function CategoryRow({
  label,
  count,
  active,
  name,
  onToggle,
}: CategoryRowProps) {
  const handleClick = React.useCallback(() => {
    onToggle(name)
  }, [onToggle, name])

  return (
    <Button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      variant="ghost"
      className={cn(
        "group w-full justify-start whitespace-normal text-left",
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
      <Badge variant="neutral" className="shrink-0 tabular-nums">
        {count}
      </Badge>
    </Button>
  )
}

export function CategoryFacet({
  categories,
  selected,
  onChange,
  className,
}: CategoryFacetProps) {
  const t = useTranslations("Glossary")
  const triggerLabel =
    selected.length === 0
      ? t("categoryFacetLabel")
      : t("categoriesSelectedCount", { count: selected.length })
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("min-h-11", className)}>
          <ListFilter aria-hidden="true" />
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        aria-label={t("categoryFacetLabel")}
        className="border-tech-line/30 bg-surface-overlay/95 w-72 border p-0 backdrop-blur-md">
        <div className="custom-vertical-scrollbar max-h-[60vh] overflow-y-auto p-3">
          <div className="flex flex-col gap-2">
            {categories.map((category) => (
              <CategoryRow
                key={category.name}
                label={category.name}
                name={category.name}
                count={category.count}
                active={selectedSet.has(category.name)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
