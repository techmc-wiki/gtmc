"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/cn"
import { normalizeGlossarySiteLocale } from "@/lib/glossary/locales"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/shadcn/popover"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/shadcn/collapsible"
import {
  GLOSSARY_DISPLAY_LOCALES,
  createGlossaryTranslationColumn,
  getGlossaryDisplayName,
  type GlossaryCoreColumn,
  type GlossaryTableColumn,
} from "@/lib/glossary/view-options"

const PICKER_CORE_COLUMNS = [
  "term",
  "shortForm",
  "description",
  "related",
  "category",
] as const satisfies readonly GlossaryCoreColumn[]

export interface ColumnPickerProps {
  locale: string
  visibleColumns: GlossaryTableColumn[]
  onChange: (columns: GlossaryTableColumn[]) => void
  className?: string
}

export function ColumnPicker({
  locale,
  visibleColumns,
  onChange,
  className,
}: ColumnPickerProps) {
  const t = useTranslations("Glossary")
  const [open, setOpen] = React.useState(false)
  const visibleColumnSet = React.useMemo(
    () => new Set(visibleColumns),
    [visibleColumns]
  )

  const toggle = React.useCallback(
    (column: GlossaryTableColumn) => {
      const visibleColumnSet = new Set(visibleColumns)
      const next = visibleColumnSet.has(column)
        ? visibleColumns.filter((entry) => entry !== column)
        : [...visibleColumns, column]
      onChange(next)
    },
    [onChange, visibleColumns]
  )

  const otherLanguageGroups = React.useMemo(() => {
    const activeLocale = normalizeGlossarySiteLocale(locale)
    const groups: Array<{
      code: (typeof GLOSSARY_DISPLAY_LOCALES)[number]
      display: string
      entries: Array<{
        column: GlossaryTableColumn
        label: string
      }>
    }> = []

    for (const code of GLOSSARY_DISPLAY_LOCALES) {
      if (code === activeLocale) continue
      groups.push({
        code,
        display: getGlossaryDisplayName(code),
        entries: [
          {
            column: createGlossaryTranslationColumn(code, "term"),
            label: getGlossaryDisplayName(code),
          },
          {
            column: createGlossaryTranslationColumn(code, "description"),
            label: t("columnDescription"),
          },
        ],
      })
    }

    return groups
  }, [locale, t])

  const coreEntries = React.useMemo(
    () =>
      PICKER_CORE_COLUMNS.map((column) => ({
        column,
        label: coreLabel(column, t),
      })),
    [t]
  )

  return (
    <div className={cn("relative flex h-9", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("columnPickerLabel")}
            className="border-tech-main/40 text-tech-main hover:bg-tech-main/10 focus-visible:outline-tech-main bg-surface-overlay/70 inline-flex h-9 w-full cursor-pointer items-center justify-center border px-3 font-mono text-xs font-bold tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto">
            [§ {t("columnPickerToggle")}]
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          aria-label={t("columnPickerLabel")}
          className="border-tech-line/30 bg-surface-overlay/95 w-72 border p-0 backdrop-blur-md">
          <div className="custom-vertical-scrollbar max-h-[60vh] overflow-y-auto p-3">
            <ColumnGroup
              title="CORE"
              entries={coreEntries}
              visibleColumnSet={visibleColumnSet}
              onToggle={toggle}
            />

            <Collapsible className="group mt-3">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="border-tech-line/30 text-tech-main/70 hover:text-tech-main flex w-full cursor-pointer list-none items-center justify-between border-b pb-1.5 text-[0.6875rem] font-semibold transition-colors">
                  <span>{t("columnLanguageGroup")}</span>
                  <span className="text-tech-main/40 transition-transform group-data-[state=open]:rotate-90">
                    ▸
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {otherLanguageGroups.map((group) => (
                  <ColumnGroup
                    key={group.code}
                    title={group.display}
                    entries={group.entries}
                    visibleColumnSet={visibleColumnSet}
                    onToggle={toggle}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function coreLabel(
  column: GlossaryCoreColumn,
  t: ReturnType<typeof useTranslations<"Glossary">>
): string {
  switch (column) {
    case "term":
      return t("columnTerm")
    case "shortForm":
      return t("columnShortForm")
    case "description":
      return t("columnDescription")
    case "related":
      return t("columnRelated")
    case "category":
      return t("columnCategory")
    case "regex":
      return t("columnRegex")
  }
}

interface ColumnGroupProps {
  title: React.ReactNode
  entries: ReadonlyArray<{ column: GlossaryTableColumn; label: string }>
  visibleColumnSet: ReadonlySet<GlossaryTableColumn>
  onToggle: (column: GlossaryTableColumn) => void
}

interface ColumnCheckboxProps {
  column: GlossaryTableColumn
  label: string
  checked: boolean
  onToggle: (column: GlossaryTableColumn) => void
}

function ColumnCheckbox({
  column,
  label,
  checked,
  onToggle,
}: ColumnCheckboxProps) {
  const handleChange = React.useCallback(() => {
    onToggle(column)
  }, [onToggle, column])

  return (
    <li>
      <label
        className={cn(
          "hover:bg-tech-main/5 flex cursor-pointer items-center gap-2.5 px-1.5 py-1.5 transition-colors",
          checked && "bg-tech-main/10"
        )}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          aria-label={label}
          className="accent-tech-main size-3.5 cursor-pointer"
        />
        <span className="text-tech-main text-xs font-medium">{label}</span>
      </label>
    </li>
  )
}

function ColumnGroup({
  title,
  entries,
  visibleColumnSet,
  onToggle,
}: ColumnGroupProps) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="border-tech-line/30 text-tech-main/70 border-b pb-1.5 text-[0.6875rem] font-semibold">
        {title}
      </p>
      <ul className="mt-1.5 flex flex-col">
        {entries.map(({ column, label }) => (
          <ColumnCheckbox
            key={column}
            column={column}
            label={label}
            checked={visibleColumnSet.has(column)}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </div>
  )
}
