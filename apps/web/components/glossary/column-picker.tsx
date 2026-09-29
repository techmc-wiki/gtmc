"use client"

import * as React from "react"
import { ChevronDown, Eye } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import { cn } from "@/lib/cn"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/shadcn/popover"
import {
  GLOSSARY_COLUMNS,
  type GlossaryColumn,
} from "@/lib/glossary/view-options"

export interface FieldPickerProps {
  visibleColumns: GlossaryColumn[]
  onChange: (columns: GlossaryColumn[]) => void
  className?: string
}

export function FieldPicker({
  visibleColumns,
  onChange,
  className,
}: FieldPickerProps) {
  const t = useTranslations("Glossary")
  const [open, setOpen] = React.useState(false)
  const visibleColumnSet = React.useMemo(
    () => new Set(visibleColumns),
    [visibleColumns]
  )

  const toggle = React.useCallback(
    (column: GlossaryColumn) => {
      const next = visibleColumnSet.has(column)
        ? visibleColumns.filter((entry) => entry !== column)
        : [...visibleColumns, column]
      onChange(next)
    },
    [onChange, visibleColumnSet, visibleColumns]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("min-h-11", className)}>
          <Eye aria-hidden="true" />
          <span>{t("fieldPickerLabel")}</span>
          <ChevronDown aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label={t("fieldPickerLabel")}
        className="border-tech-line/30 bg-surface-overlay/95 w-72 border p-0 backdrop-blur-md">
        <div className="custom-vertical-scrollbar max-h-[60vh] overflow-y-auto p-3">
          <ul className="flex flex-col">
            {GLOSSARY_COLUMNS.map((column) => {
              const checked = visibleColumnSet.has(column)
              const label = t(
                column === "term"
                  ? "columnTerm"
                  : column === "shortForm"
                    ? "columnShortForm"
                    : "columnDescription"
              )
              return (
                <li key={column}>
                  <label
                    className={cn(
                      "hover:bg-tech-main/5 flex cursor-pointer items-center gap-2.5 px-1.5 py-1.5 transition-colors",
                      checked && "bg-tech-main/10"
                    )}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(column)}
                      aria-label={label}
                      className="accent-tech-main size-3.5 cursor-pointer"
                    />
                    <span className="text-tech-main text-xs font-medium">
                      {label}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  )
}
