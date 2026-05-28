"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { InputBox } from "@/components/ui/input-box"
import { TextAreaBox } from "@/components/ui/textarea-box"
import { SegmentedControl } from "@/components/ui/segmented-control"
import type { GlossaryRow, GlossaryColumn } from "@/lib/glossary/csv"
import {
  LANGUAGE_CODES,
  LANGUAGE_DISPLAY,
  LOCALE_TO_COLUMN,
  isGlossaryLocale,
} from "@/lib/glossary/locales"
import type { GlossaryLocale } from "@/lib/glossary/manifest"

export type GlossaryEditOperationKind = "edit" | "add" | "delete"

export interface GlossaryEditOperation {
  kind: GlossaryEditOperationKind
  slug: string
  before?: GlossaryRow
  after?: GlossaryRow
}

export interface GlossaryEditCardDanglingRef {
  slug: string
  fullFormEn: string
}

export interface GlossaryEditCardProps {
  operation: GlossaryEditOperation
  locale: string
  onChange: (updated: { slug: string; after: GlossaryRow }) => void
  onRemove: (slug: string) => void
  danglingRefs?: ReadonlyArray<GlossaryEditCardDanglingRef>
}

const LABEL_CLASS =
  "font-mono text-xs tracking-widest uppercase text-tech-main/50"
const ERROR_CLASS = "font-mono text-xs text-red-600/80"

const KIND_BADGE: Record<
  GlossaryEditOperationKind,
  { label: string; border: string; text: string }
> = {
  edit: {
    label: "EDIT",
    border: "border-blue-500/40",
    text: "text-blue-700",
  },
  add: {
    label: "ADD",
    border: "border-green-500/40",
    text: "text-green-700",
  },
  delete: {
    label: "DELETE",
    border: "border-red-700/40",
    text: "text-red-700",
  },
}

interface EnglishFieldDef {
  column: GlossaryColumn
  label: string
  multiline?: boolean
}

const ENGLISH_FIELDS: ReadonlyArray<EnglishFieldDef> = [
  { column: "Full Form (English)", label: "Full Form (English)" },
  { column: "Short Form", label: "Short Form" },
  { column: "Regex", label: "Regex" },
  { column: "Category", label: "Category" },
  { column: "Description", label: "Description", multiline: true },
  { column: "Related", label: "Related" },
]

type TabValue = "active" | "english" | "other"

const DEBOUNCE_MS = 200

const EMPTY_DANGLING_REFS: ReadonlyArray<GlossaryEditCardDanglingRef> = []

export function GlossaryEditCard({
  operation,
  locale,
  onChange,
  onRemove,
  danglingRefs = EMPTY_DANGLING_REFS,
}: GlossaryEditCardProps) {
  const isDelete = operation.kind === "delete"
  const isAdd = operation.kind === "add"

  const seed = operation.after ?? operation.before ?? null
  const [row, setRow] = React.useState<GlossaryRow | null>(
    seed ? ({ ...seed } as GlossaryRow) : null
  )

  const activeLocale: GlossaryLocale | null = isGlossaryLocale(locale)
    ? locale
    : null

  const [tab, setTab] = React.useState<TabValue>(
    activeLocale ? "active" : "english"
  )

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const updateField = React.useCallback(
    (column: GlossaryColumn, value: string) => {
      setRow((prev) => {
        if (!prev) return prev
        const next: GlossaryRow = { ...prev, [column]: value }
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
        }
        debounceRef.current = setTimeout(() => {
          onChange({ slug: operation.slug, after: next })
        }, DEBOUNCE_MS)
        return next
      })
    },
    [onChange, operation.slug]
  )

  const handleRemove = React.useCallback(() => {
    onRemove(operation.slug)
  }, [onRemove, operation.slug])

  const headerTerm = isDelete
    ? (operation.before?.["Full Form (English)"] ?? operation.slug)
    : row?.["Full Form (English)"]?.trim()
      ? row["Full Form (English)"]
      : operation.slug

  const badge = KIND_BADGE[operation.kind]

  const englishMissing = isAdd && !(row?.["Full Form (English)"] ?? "").trim()

  const otherLanguageCodes = React.useMemo(
    () => LANGUAGE_CODES.filter((code) => code !== activeLocale),
    [activeLocale]
  )

  const tabOptions = React.useMemo(() => {
    const options: { value: TabValue; label: string }[] = []
    if (activeLocale) {
      options.push({
        value: "active",
        label: LANGUAGE_DISPLAY[activeLocale],
      })
    }
    options.push({ value: "english", label: "English" })
    options.push({ value: "other", label: "Other Languages" })
    return options
  }, [activeLocale])

  return (
    <article
      className={cn(
        "border-tech-line/20 flex flex-col gap-3 border bg-white/80 p-4"
      )}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "border-l-2 pl-2 font-mono text-xs tracking-widest",
              badge.border,
              badge.text
            )}>
            [{badge.label}]
          </span>
          <span
            className="text-tech-main-dark truncate font-mono text-sm font-medium"
            title={headerTerm}>
            {headerTerm || "—"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove operation"
          className={cn(
            "text-tech-main/60 border-tech-main/20 cursor-pointer border",
            "px-2 py-1 font-mono text-base leading-none",
            "transition-colors hover:border-red-700/40 hover:text-red-700"
          )}>
          [×]
        </button>
      </header>

      {isDelete && (
        <DeleteSummary
          before={operation.before ?? null}
          danglingRefs={danglingRefs}
        />
      )}

      {!isDelete && row && (
        <>
          <SegmentedControl
            options={tabOptions}
            value={tab}
            onValueChange={setTab}
            controlRole="tablist"
            ariaLabel="Edit form tabs"
          />

          {tab === "active" && activeLocale && (
            <ActiveLocaleFields
              row={row}
              code={activeLocale}
              onChange={updateField}
            />
          )}

          {tab === "english" && (
            <EnglishFields
              row={row}
              onChange={updateField}
              missing={englishMissing}
              showRequired={isAdd}
            />
          )}

          {tab === "other" && (
            <OtherLanguagesFields
              row={row}
              codes={otherLanguageCodes}
              onChange={updateField}
            />
          )}
        </>
      )}
    </article>
  )
}

function DeleteSummary({
  before,
  danglingRefs,
}: {
  before: GlossaryRow | null
  danglingRefs: ReadonlyArray<GlossaryEditCardDanglingRef>
}) {
  const summaryRows = before
    ? (
        [
          ["Short Form", before["Short Form"]],
          ["Category", before.Category],
          ["Regex", before.Regex],
          ["Description", before.Description],
          ["Related", before.Related],
        ] as const
      ).filter(([, value]) => value && value.trim().length > 0)
    : []

  return (
    <div className="flex flex-col gap-3">
      {summaryRows.length > 0 && (
        <dl className="text-tech-main/50 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 font-mono text-xs">
          {summaryRows.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="tracking-widest uppercase">{label}</dt>
              <dd className="break-words whitespace-pre-wrap">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}

      {danglingRefs.length > 0 && (
        <div className="border border-yellow-500/40 bg-yellow-500/10 p-3">
          <p
            className={cn(
              "mb-1 font-mono text-xs tracking-widest text-yellow-800 uppercase"
            )}>
            ⚠ Dangling references
          </p>
          <p className="font-mono text-xs text-yellow-900">
            Removing this term will orphan references in:{" "}
            {danglingRefs.map((ref) => ref.fullFormEn || ref.slug).join(", ")}
          </p>
        </div>
      )}
    </div>
  )
}

interface EnglishFieldItemProps {
  field: EnglishFieldDef
  row: GlossaryRow
  onChange: (column: GlossaryColumn, value: string) => void
  showRequired: boolean
  missing: boolean
}

function EnglishFieldItem({
  field,
  row,
  onChange,
  showRequired,
  missing,
}: EnglishFieldItemProps) {
  const isEnglishTerm = field.column === "Full Form (English)"
  const fieldError = isEnglishTerm && missing

  const handleValueChange = React.useCallback(
    (value: string) => {
      onChange(field.column, value)
    },
    [onChange, field.column]
  )

  return (
    <Field
      column={field.column}
      label={field.label}
      required={showRequired && isEnglishTerm}
      value={row[field.column] ?? ""}
      multiline={field.multiline}
      error={fieldError}
      onValueChange={handleValueChange}
      errorMessage={fieldError ? "English term is required." : undefined}
    />
  )
}

function EnglishFields({
  row,
  onChange,
  missing,
  showRequired,
}: {
  row: GlossaryRow
  onChange: (column: GlossaryColumn, value: string) => void
  missing: boolean
  showRequired: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {ENGLISH_FIELDS.map((field) => (
        <EnglishFieldItem
          key={field.column}
          field={field}
          row={row}
          onChange={onChange}
          showRequired={showRequired}
          missing={missing}
        />
      ))}
    </div>
  )
}

function ActiveLocaleFields({
  row,
  code,
  onChange,
}: {
  row: GlossaryRow
  code: GlossaryLocale
  onChange: (column: GlossaryColumn, value: string) => void
}) {
  const { termColumn, descColumn } = LOCALE_TO_COLUMN[code]
  const display = LANGUAGE_DISPLAY[code]
  const termCol = termColumn as GlossaryColumn
  const descCol = descColumn as GlossaryColumn

  const handleTermChange = React.useCallback(
    (value: string) => onChange(termCol, value),
    [onChange, termCol]
  )

  const handleDescChange = React.useCallback(
    (value: string) => onChange(descCol, value),
    [onChange, descCol]
  )

  return (
    <div className="flex flex-col gap-3">
      <Field
        column={termCol}
        label={display}
        value={row[termCol] ?? ""}
        onValueChange={handleTermChange}
      />
      <Field
        column={descCol}
        label={`Description (${display})`}
        value={row[descCol] ?? ""}
        multiline
        onValueChange={handleDescChange}
      />
    </div>
  )
}

interface LanguagePairFieldsProps {
  row: GlossaryRow
  code: GlossaryLocale
  onChange: (column: GlossaryColumn, value: string) => void
}

function LanguagePairFields({ row, code, onChange }: LanguagePairFieldsProps) {
  const { termColumn, descColumn } = LOCALE_TO_COLUMN[code]
  const display = LANGUAGE_DISPLAY[code]
  const termCol = termColumn as GlossaryColumn
  const descCol = descColumn as GlossaryColumn

  const handleTermChange = React.useCallback(
    (value: string) => onChange(termCol, value),
    [onChange, termCol]
  )

  const handleDescChange = React.useCallback(
    (value: string) => onChange(descCol, value),
    [onChange, descCol]
  )

  return (
    <div className="border-tech-line/10 ml-1 flex flex-col gap-2 border-l-2 pl-3">
      <Field
        column={termCol}
        label={display}
        value={row[termCol] ?? ""}
        onValueChange={handleTermChange}
      />
      <Field
        column={descCol}
        label={`Description (${display})`}
        value={row[descCol] ?? ""}
        multiline
        onValueChange={handleDescChange}
      />
    </div>
  )
}

function OtherLanguagesFields({
  row,
  codes,
  onChange,
}: {
  row: GlossaryRow
  codes: GlossaryLocale[]
  onChange: (column: GlossaryColumn, value: string) => void
}) {
  return (
    <details className="border-tech-line/10 border bg-white/40">
      <summary
        className={cn(
          "text-tech-main/60 hover:text-tech-main cursor-pointer px-3 py-2",
          "font-mono text-xs tracking-widest uppercase select-none"
        )}>
        Show {codes.length} language pair{codes.length === 1 ? "" : "s"}
      </summary>
      <div className="flex flex-col gap-4 p-3">
        {codes.map((code) => (
          <LanguagePairFields
            key={code}
            row={row}
            code={code}
            onChange={onChange}
          />
        ))}
      </div>
    </details>
  )
}

interface FieldProps {
  column: GlossaryColumn
  label: string
  value: string
  multiline?: boolean
  required?: boolean
  error?: boolean
  errorMessage?: string
  onValueChange: (value: string) => void
}

function Field({
  column,
  label,
  value,
  multiline,
  required,
  error,
  errorMessage,
  onValueChange,
}: FieldProps) {
  const id = React.useId()
  const fieldId = `glossary-field-${column.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${id}`

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onValueChange(event.target.value)
    },
    [onValueChange]
  )

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className={LABEL_CLASS}>
        {label}
        {required && <span className="ml-1 text-red-600/80">*</span>}
      </label>
      {multiline ? (
        <TextAreaBox
          id={fieldId}
          value={value}
          error={error}
          onChange={handleChange}
          rows={3}
        />
      ) : (
        <InputBox
          id={fieldId}
          value={value}
          error={error}
          onChange={handleChange}
        />
      )}
      {error && errorMessage && <p className={ERROR_CLASS}>{errorMessage}</p>}
    </div>
  )
}
