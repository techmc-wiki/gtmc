"use client"

import * as React from "react"
import { AlertTriangle, Trash2 } from "lucide-react"

import { cn } from "@/lib/cn"
import { Input } from "@/components/ui/shadcn/input"
import { Textarea } from "@/components/ui/shadcn/textarea"
import { Label } from "@/components/ui/shadcn/label"
import { Button } from "@/components/ui/shadcn/button"
import { Badge } from "@/components/ui/shadcn/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/shadcn/card"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/shadcn/tabs"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/shadcn/collapsible"
import type { GlossaryRow, GlossaryColumn } from "@/lib/glossary/csv"
import {
  LANGUAGE_CODES,
  LANGUAGE_DISPLAY,
  LOCALE_TO_COLUMN,
  isGlossaryLocale,
  type GlossaryLocale,
} from "@/lib/glossary/locales"

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
  isReadOnly?: boolean
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
  isReadOnly = false,
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

  React.useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    },
    []
  )

  const updateField = React.useCallback(
    (column: GlossaryColumn, value: string) => {
      if (isReadOnly) return
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
    [onChange, operation.slug, isReadOnly]
  )

  const handleRemove = React.useCallback(() => {
    onRemove(operation.slug)
  }, [onRemove, operation.slug])

  const headerTerm = isDelete
    ? (operation.before?.["Full Form (English)"] ?? operation.slug)
    : row?.["Full Form (English)"]?.trim()
      ? row["Full Form (English)"]
      : operation.slug

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
    <Card
      tone={isDelete ? "danger" : "main"}
      borderOpacity="subtle"
      background="default"
      padding="compact"
      brackets="hidden"
      hover="none"
      className="border-border">
      <CardHeader className="border-border/40 flex flex-row items-center justify-between gap-3 border-b p-0 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Badge
            variant={
              operation.kind === "add"
                ? "success"
                : operation.kind === "delete"
                  ? "destructive"
                  : "secondary"
            }
            className="text-[10px]">
            {operation.kind === "add"
              ? "New Term"
              : operation.kind === "delete"
                ? "Deleted"
                : "Edit"}
          </Badge>
          <CardTitle
            className={cn(
              "text-sm font-semibold truncate",
              isDelete && "line-through text-red-700 dark:text-red-400"
            )}
            title={headerTerm}>
            {headerTerm || "—"}
          </CardTitle>
        </div>
        {!isReadOnly && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleRemove}
            aria-label="Remove term edit"
            className="text-muted-foreground hover:bg-red-500/10 hover:text-red-600">
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0 pt-3">
        {isDelete && (
          <DeleteSummary
            before={operation.before ?? null}
            danglingRefs={danglingRefs}
          />
        )}

        {!isDelete && row && (
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as TabValue)}
            className="w-full">
            <TabsList className="bg-muted/60 mb-3 h-8 p-0.5">
              {tabOptions.map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className="h-7 px-3 text-xs">
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {activeLocale && (
              <TabsContent value="active" className="mt-0 space-y-3">
                <ActiveLocaleFields
                  row={row}
                  code={activeLocale}
                  onChange={updateField}
                  disabled={isReadOnly}
                />
              </TabsContent>
            )}

            <TabsContent value="english" className="mt-0 space-y-3">
              <EnglishFields
                row={row}
                onChange={updateField}
                missing={englishMissing}
                showRequired={isAdd}
                disabled={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="other" className="mt-0 space-y-3">
              <OtherLanguagesFields
                row={row}
                codes={otherLanguageCodes}
                onChange={updateField}
                disabled={isReadOnly}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
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
        <dl className="text-muted-foreground grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-xs">
          {summaryRows.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-foreground font-medium">{label}:</dt>
              <dd className="break-words line-through">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}

      {danglingRefs.length > 0 && (
        <div className="rounded-none border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>Dangling References Warning</span>
          </div>
          <p className="leading-relaxed text-amber-900/90 dark:text-amber-200/90">
            Removing this term will orphan references in:{" "}
            <span className="font-medium">
              {danglingRefs.map((ref) => ref.fullFormEn || ref.slug).join(", ")}
            </span>
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
  disabled?: boolean
}

function EnglishFieldItem({
  field,
  row,
  onChange,
  showRequired,
  missing,
  disabled = false,
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
      value={row[field.column] || ""}
      multiline={field.multiline}
      error={fieldError}
      disabled={disabled}
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
  disabled = false,
}: {
  row: GlossaryRow
  onChange: (column: GlossaryColumn, value: string) => void
  missing: boolean
  showRequired: boolean
  disabled?: boolean
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
          disabled={disabled}
        />
      ))}
    </div>
  )
}

function ActiveLocaleFields({
  row,
  code,
  onChange,
  disabled = false,
}: {
  row: GlossaryRow
  code: GlossaryLocale
  onChange: (column: GlossaryColumn, value: string) => void
  disabled?: boolean
}) {
  return (
    <LanguageFields
      row={row}
      code={code}
      onChange={onChange}
      disabled={disabled}
    />
  )
}

interface LanguagePairFieldsProps {
  row: GlossaryRow
  code: GlossaryLocale
  onChange: (column: GlossaryColumn, value: string) => void
  disabled?: boolean
}

function LanguagePairFields({
  row,
  code,
  onChange,
  disabled = false,
}: LanguagePairFieldsProps) {
  return (
    <LanguageFields
      row={row}
      code={code}
      onChange={onChange}
      disabled={disabled}
      className="border-border border-l-2 pl-3"
    />
  )
}

function LanguageFields({
  row,
  code,
  onChange,
  disabled = false,
  className,
}: LanguagePairFieldsProps & { className?: string; disabled?: boolean }) {
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
    <div className={cn("flex flex-col gap-3", className)}>
      <Field
        column={termCol}
        label={display}
        value={row[termCol] || ""}
        disabled={disabled}
        onValueChange={handleTermChange}
      />
      <Field
        column={descCol}
        label={`Description (${display})`}
        value={row[descCol] || ""}
        multiline
        disabled={disabled}
        onValueChange={handleDescChange}
      />
    </div>
  )
}

function OtherLanguagesFields({
  row,
  codes,
  onChange,
  disabled = false,
}: {
  row: GlossaryRow
  codes: GlossaryLocale[]
  onChange: (column: GlossaryColumn, value: string) => void
  disabled?: boolean
}) {
  return (
    <Collapsible className="border-border bg-surface-overlay/30 border">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground w-full cursor-pointer px-3.5 py-2 text-left text-xs font-medium transition-colors">
          Show {codes.length} other language{" "}
          {codes.length === 1 ? "pair" : "pairs"} →
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 p-3.5 pt-1">
        {codes.map((code) => (
          <LanguagePairFields
            key={code}
            row={row}
            code={code}
            onChange={onChange}
            disabled={disabled}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
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
  disabled?: boolean
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
  disabled = false,
  onValueChange,
}: FieldProps) {
  const id = React.useId()
  const fieldId = `glossary-field-${column.replaceAll(/[^a-z0-9]/gi, "-").toLowerCase()}-${id}`

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onValueChange(event.target.value)
    },
    [onValueChange]
  )

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId} className="text-foreground text-xs font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      {multiline ? (
        <Textarea
          id={fieldId}
          value={value}
          disabled={disabled}
          aria-invalid={error || undefined}
          className={cn(
            "text-xs leading-relaxed",
            error && "border-red-500 text-red-600 focus-visible:ring-red-500"
          )}
          onChange={handleChange}
          rows={3}
        />
      ) : (
        <Input
          id={fieldId}
          value={value}
          disabled={disabled}
          aria-invalid={error || undefined}
          className={cn(
            "h-8 text-xs",
            error && "border-red-500 text-red-600 focus-visible:ring-red-500"
          )}
          onChange={handleChange}
        />
      )}
      {error && errorMessage && (
        <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
