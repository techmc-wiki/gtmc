"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/cn"
import {
  LANGUAGE_CODES,
  LANGUAGE_DISPLAY,
  LOCALE_TO_COLUMN,
  isGlossaryLocale,
} from "@/lib/glossary/locales"

const STORAGE_KEY = "gtmc:glossary:columns:v1"

const CORE_COLUMNS = [
  "Full Form (English)",
  "Short Form",
  "Description",
  "Related",
  "Category",
] as const

export interface ColumnPickerProps {
  locale: string
  visibleColumns: string[]
  onChange: (columns: string[]) => void
  defaultColumns: string[]
  className?: string
}

export function ColumnPicker({
  locale,
  visibleColumns,
  onChange,
  defaultColumns,
  className,
}: ColumnPickerProps) {
  const mounted = useMounted()
  const t = useTranslations("Glossary")
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  const hydratedRef = React.useRef(false)
  React.useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (
          Array.isArray(parsed) &&
          parsed.every((value) => typeof value === "string")
        ) {
          onChange(parsed)
          return
        }
      }
    } catch {
      // SSR / private browsing — localStorage unavailable
    }
    onChange(defaultColumns)
  }, [defaultColumns, onChange])

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

  const persist = React.useCallback(
    (next: string[]) => {
      onChange(next)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // SSR / private browsing
      }
    },
    [onChange]
  )

  const toggleOpen = React.useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const toggle = React.useCallback(
    (column: string) => {
      const next = visibleColumns.includes(column)
        ? visibleColumns.filter((entry) => entry !== column)
        : [...visibleColumns, column]
      persist(next)
    },
    [persist, visibleColumns]
  )

  const activeLocaleEntries = React.useMemo(() => {
    if (!isGlossaryLocale(locale)) return []
    const mapping = LOCALE_TO_COLUMN[locale]
    return [
      { column: mapping.termColumn, label: LANGUAGE_DISPLAY[locale] },
      {
        column: mapping.descColumn,
        label: `${t("columnDescription")} (${LANGUAGE_DISPLAY[locale]})`,
      },
    ]
  }, [locale, t])

  const otherLanguageGroups = React.useMemo(() => {
    return LANGUAGE_CODES.filter((code) => code !== locale).map((code) => {
      const mapping = LOCALE_TO_COLUMN[code]
      return {
        code,
        display: LANGUAGE_DISPLAY[code],
        entries: [
          { column: mapping.termColumn, label: LANGUAGE_DISPLAY[code] },
          {
            column: mapping.descColumn,
            label: t("columnDescription"),
          },
        ],
      }
    })
  }, [locale, t])

  const coreEntries = React.useMemo(
    () =>
      CORE_COLUMNS.map((column) => ({
        column,
        label: coreLabel(column, t),
      })),
    [t]
  )

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("columnPickerLabel")}
        onClick={toggleOpen}
        className="border-tech-main/40 text-tech-main hover:bg-tech-main/10 focus-visible:outline-tech-main inline-flex min-h-9 w-full cursor-pointer items-center justify-center border bg-white/70 px-3 py-1.5 font-mono text-xs font-bold tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto">
        [§ COLUMNS]
      </button>

      {mounted && open ? (
        <dialog
          open
          aria-label={t("columnPickerLabel")}
          className="border-tech-line/30 absolute right-0 z-40 mt-2 w-72 border bg-white/95 backdrop-blur-md">
          <div className="custom-vertical-scrollbar max-h-[60vh] overflow-y-auto p-3">
            <ColumnGroup
              title="CORE"
              entries={coreEntries}
              visibleColumns={visibleColumns}
              onToggle={toggle}
            />

            {activeLocaleEntries.length > 0 ? (
              <ColumnGroup
                title={t("searchScopeActive")}
                entries={activeLocaleEntries}
                visibleColumns={visibleColumns}
                onToggle={toggle}
              />
            ) : null}

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
  column: (typeof CORE_COLUMNS)[number],
  t: ReturnType<typeof useTranslations<"Glossary">>
): string {
  switch (column) {
    case "Full Form (English)":
      return t("columnTerm")
    case "Short Form":
      return t("columnShortForm")
    case "Description":
      return t("columnDescription")
    case "Related":
      return t("columnRelated")
    case "Category":
      return "CATEGORY"
  }
}

interface ColumnGroupProps {
  title: React.ReactNode
  entries: ReadonlyArray<{ column: string; label: string }>
  visibleColumns: string[]
  onToggle: (column: string) => void
}

interface ColumnCheckboxProps {
  column: string
  label: string
  checked: boolean
  onToggle: (column: string) => void
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
