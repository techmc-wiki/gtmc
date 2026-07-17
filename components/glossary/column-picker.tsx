"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/cn"
import { normalizeGlossarySiteLocale } from "@/lib/glossary/locales"
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
  const mounted = useMounted()
  const t = useTranslations("Glossary")
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    function handlePointer(event: MouseEvent) {
      const node = containerRef.current
      if (!node) return
      if (!node.contains(event.target as Node)) setOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handlePointer)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  const toggleOpen = React.useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const toggle = React.useCallback(
    (column: GlossaryTableColumn) => {
      const next = visibleColumns.includes(column)
        ? visibleColumns.filter((entry) => entry !== column)
        : [...visibleColumns, column]
      onChange(next)
    },
    [onChange, visibleColumns]
  )

  const otherLanguageGroups = React.useMemo(() => {
    const activeLocale = normalizeGlossarySiteLocale(locale)
    return GLOSSARY_DISPLAY_LOCALES.filter((code) => code !== activeLocale).map(
      (code) => ({
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
    )
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
    <div ref={containerRef} className={cn("relative flex h-9", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("columnPickerLabel")}
        onClick={toggleOpen}
        className="border-tech-main/40 text-tech-main hover:bg-tech-main/10 focus-visible:outline-tech-main bg-surface-overlay/70 inline-flex h-9 w-full cursor-pointer items-center justify-center border px-3 font-mono text-xs font-bold tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto">
        [§ {t("columnPickerToggle")}]
      </button>

      {mounted && open ? (
        <dialog
          open
          aria-label={t("columnPickerLabel")}
          className="border-tech-line/30 bg-surface-overlay/95 absolute top-full right-0 z-40 mt-2 w-72 border backdrop-blur-md">
          <div className="custom-vertical-scrollbar max-h-[60vh] overflow-y-auto p-3">
            <ColumnGroup
              title="CORE"
              entries={coreEntries}
              visibleColumns={visibleColumns}
              onToggle={toggle}
            />

            <details className="group mt-3">
              <summary className="border-tech-line/30 text-tech-main/70 hover:text-tech-main flex cursor-pointer list-none items-center justify-between border-b pb-1.5 font-mono text-[0.6875rem] font-bold tracking-widest uppercase transition-colors [&::-webkit-details-marker]:hidden">
                <span>{t("columnLanguageGroup")}</span>
                <span className="text-tech-main/40 transition-transform group-open:rotate-90">
                  ▸
                </span>
              </summary>
              <div className="mt-2 space-y-2">
                {otherLanguageGroups.map((group) => (
                  <ColumnGroup
                    key={group.code}
                    title={group.display}
                    entries={group.entries}
                    visibleColumns={visibleColumns}
                    onToggle={toggle}
                  />
                ))}
              </div>
            </details>
          </div>
        </dialog>
      ) : null}
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
  visibleColumns: GlossaryTableColumn[]
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
        <span className="text-tech-main font-mono text-xs tracking-widest uppercase">
          {label}
        </span>
      </label>
    </li>
  )
}

function ColumnGroup({
  title,
  entries,
  visibleColumns,
  onToggle,
}: ColumnGroupProps) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="border-tech-line/30 text-tech-main/70 border-b pb-1.5 font-mono text-[0.6875rem] font-bold tracking-widest uppercase">
        {title}
      </p>
      <ul className="mt-1.5 flex flex-col">
        {entries.map(({ column, label }) => (
          <ColumnCheckbox
            key={column}
            column={column}
            label={label}
            checked={visibleColumns.includes(column)}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </div>
  )
}
