"use client"

import * as React from "react"
import { diffWords } from "diff"
import { useTranslations } from "next-intl"
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  GitPullRequest,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/shadcn/button"
import { Badge } from "@/components/ui/shadcn/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/shadcn/card"
import { ScrollArea } from "@/components/ui/shadcn/scroll-area"
import { Separator } from "@/components/ui/shadcn/separator"
import { GLOSSARY_COLUMNS, type GlossaryRow } from "@/lib/glossary/csv"
import { cn } from "@/lib/cn"

export interface GlossaryDiffOperation {
  kind: "edit" | "add" | "delete"
  slug: string
  before?: GlossaryRow
  after?: GlossaryRow
}

export interface GlossaryDiffPreviewProps {
  operations: GlossaryDiffOperation[]
  onClose: () => void
  onSubmit: (opts: { useRealEmail: boolean }) => Promise<void>
  isSubmitting: boolean
  canSubmit?: boolean
  validationMessage?: string
  className?: string
  authorName?: string
  noreplyEmail?: string
  realEmail?: string | null
  submitState?: "idle" | "running" | "success" | "error"
  submitResult?: { prUrl: string; prNumber: number } | null
  onDismissSuccess?: () => void
}

function renderInlineDiff(oldText: string, newText: string): React.ReactNode {
  const changes = diffWords(oldText, newText)
  let keyCounter = 0
  return changes.map((part) => {
    const key = `${part.added ? "a" : part.removed ? "r" : "s"}-${keyCounter++}`
    if (part.added) {
      return (
        <ins
          key={key}
          className="rounded-xs bg-green-500/15 px-1 py-0.5 font-medium text-green-700 no-underline dark:text-green-400">
          {part.value}
        </ins>
      )
    }
    if (part.removed) {
      return (
        <del
          key={key}
          className="rounded-xs bg-red-500/15 px-1 py-0.5 text-red-700 line-through opacity-80 dark:text-red-400">
          {part.value}
        </del>
      )
    }
    return <span key={key}>{part.value}</span>
  })
}

function changedColumns(
  before: GlossaryRow,
  after: GlossaryRow
): readonly (typeof GLOSSARY_COLUMNS)[number][] {
  return GLOSSARY_COLUMNS.filter((col) => before[col] !== after[col])
}

function populatedColumns(
  row: GlossaryRow
): readonly (typeof GLOSSARY_COLUMNS)[number][] {
  return GLOSSARY_COLUMNS.filter((col) => row[col]?.trim() !== "")
}

interface OperationCardProps {
  operation: GlossaryDiffOperation
}

function EditOperationCard({ operation }: OperationCardProps) {
  const before = operation.before ?? ({} as GlossaryRow)
  const after = operation.after ?? ({} as GlossaryRow)
  const fields = changedColumns(before, after)

  return (
    <Card
      tone="main"
      borderOpacity="subtle"
      background="default"
      padding="compact"
      brackets="hidden"
      hover="none"
      className="border-tech-line/40">
      <CardHeader className="p-0 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-foreground text-sm font-semibold">
            {operation.after?.["Full Form (English)"] ||
              operation.before?.["Full Form (English)"] ||
              operation.slug}
          </CardTitle>
          <Badge variant="secondary">Edited</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {fields.length === 0 ? (
          <p className="text-muted-foreground text-xs italic">
            No field changes detected.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {fields.map((field) => (
              <div
                key={field}
                className="bg-surface-overlay/50 border-border/50 rounded-none border p-2.5 text-xs">
                <div className="text-muted-foreground mb-1 font-mono text-[11px] tracking-wider uppercase">
                  {field}
                </div>
                <div className="text-foreground leading-relaxed break-words whitespace-pre-wrap">
                  {renderInlineDiff(before[field] || "", after[field] || "")}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AddOperationCard({ operation }: OperationCardProps) {
  const after = operation.after ?? ({} as GlossaryRow)
  const fields = populatedColumns(after)

  return (
    <Card
      tone="main"
      borderOpacity="subtle"
      background="default"
      padding="compact"
      brackets="hidden"
      hover="none"
      className="border-tech-line/40">
      <CardHeader className="p-0 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-foreground text-sm font-semibold">
            {after["Full Form (English)"] || operation.slug}
          </CardTitle>
          <Badge variant="success">New Term</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {fields.length === 0 ? (
          <p className="text-muted-foreground text-xs italic">Empty term.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field}
                className="bg-surface-overlay/50 border-border/50 rounded-none border p-2 text-xs">
                <span className="text-muted-foreground block font-mono text-[10px] tracking-wider uppercase">
                  {field}
                </span>
                <span className="text-foreground mt-0.5 block break-words whitespace-pre-wrap">
                  {after[field]}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DeleteOperationCard({ operation }: OperationCardProps) {
  const before = operation.before ?? ({} as GlossaryRow)
  const fields = populatedColumns(before)

  return (
    <Card
      tone="danger"
      borderOpacity="subtle"
      background="subtle"
      padding="compact"
      brackets="hidden"
      hover="none"
      className="border-red-500/30">
      <CardHeader className="p-0 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-red-700 line-through dark:text-red-400">
            {before["Full Form (English)"] || operation.slug}
          </CardTitle>
          <Badge variant="destructive">To be deleted</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {fields.length > 0 && (
          <div className="flex flex-col gap-1 text-xs opacity-75">
            {fields.map((field) => (
              <div key={field} className="flex gap-2">
                <span className="text-muted-foreground shrink-0 font-mono text-[10px] tracking-wider uppercase sm:w-32">
                  {field}:
                </span>
                <span className="text-foreground break-words line-through">
                  {before[field]}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function GlossaryDiffPreview({
  operations,
  onClose,
  onSubmit,
  isSubmitting,
  canSubmit = true,
  validationMessage,
  className,
  authorName,
  noreplyEmail,
  realEmail,
  submitState = "idle",
  submitResult,
  onDismissSuccess,
}: GlossaryDiffPreviewProps) {
  const t = useTranslations("Glossary")
  const [useRealEmail, setUseRealEmail] = React.useState(false)

  const counts = React.useMemo(() => {
    let edit = 0
    let add = 0
    let del = 0
    for (const op of operations) {
      if (op.kind === "edit") edit++
      else if (op.kind === "add") add++
      else if (op.kind === "delete") del++
    }
    return { edit, add, delete: del }
  }, [operations])

  const handleSubmit = React.useCallback(async () => {
    if (isSubmitting || !canSubmit) return
    await onSubmit({ useRealEmail })
  }, [isSubmitting, canSubmit, onSubmit, useRealEmail])

  const canToggleRealEmail = Boolean(
    realEmail && noreplyEmail && realEmail !== noreplyEmail
  )

  if (submitState === "success" && submitResult) {
    return (
      <div className={cn("flex flex-col p-6 sm:p-8", className)}>
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-green-500/15 text-green-600">
            <CheckCircle2 className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-foreground text-lg font-semibold">
              Pull Request #{submitResult.prNumber} Opened
            </h3>
            <p className="text-muted-foreground max-w-lg text-xs leading-relaxed sm:text-sm">
              {t("editorPrOwnershipBody")}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={submitResult.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border hover:bg-accent inline-flex items-center gap-1.5 border px-4 py-2 font-mono text-xs font-bold tracking-wider uppercase transition-colors">
              View on GitHub <ExternalLink className="size-3.5" />
            </a>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onDismissSuccess || onClose}>
              Return to drafts
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const submitDisabled = isSubmitting || !canSubmit || operations.length === 0

  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="text-foreground font-mono text-xs font-medium">
            {operations.length} {operations.length === 1 ? "change" : "changes"}
          </span>
          <div className="flex items-center gap-1.5">
            {counts.edit > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {counts.edit} Edited
              </Badge>
            )}
            {counts.add > 0 && (
              <Badge variant="success" className="text-[10px]">
                {counts.add} Added
              </Badge>
            )}
            {counts.delete > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {counts.delete} Deleted
              </Badge>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="max-h-[50vh] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 pr-3">
          {operations.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm italic">
              No staged operations.
            </p>
          ) : (
            operations.map((op) => {
              const key = `${op.kind}:${op.slug}`
              if (op.kind === "edit") {
                return <EditOperationCard key={key} operation={op} />
              }
              if (op.kind === "add") {
                return <AddOperationCard key={key} operation={op} />
              }
              return <DeleteOperationCard key={key} operation={op} />
            })
          )}
        </div>
      </ScrollArea>

      <Separator />

      {canToggleRealEmail ? (
        <div className="bg-surface-overlay/50 border-border border-b px-4 py-3 sm:px-6">
          <label
            htmlFor="diff-preview-real-email-toggle"
            aria-label={t("editorRealEmailToggleLabel")}
            className="flex cursor-pointer items-start gap-2.5 text-xs">
            <input
              id="diff-preview-real-email-toggle"
              type="checkbox"
              checked={useRealEmail}
              onChange={(e) => setUseRealEmail(e.target.checked)}
              disabled={isSubmitting}
              aria-label={t("editorRealEmailToggleLabel")}
              className="accent-tech-signal mt-0.5 size-4 cursor-pointer"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-foreground font-medium">
                {t("editorRealEmailToggleLabel")}
              </span>
              <span className="text-muted-foreground text-[11px]">
                {useRealEmail
                  ? `Commit will be authored by ${authorName} <${realEmail}>`
                  : `Default commit author: ${authorName} <${noreplyEmail}>`}
              </span>
            </span>
          </label>
        </div>
      ) : null}

      {validationMessage ? (
        <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-700 sm:px-6 dark:text-red-400">
          <AlertCircle className="size-4 shrink-0" />
          <span className="leading-snug">{validationMessage}</span>
        </div>
      ) : null}

      <div className="bg-surface flex flex-col-reverse gap-2 p-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={submitDisabled}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Submitting Pull Request…
            </>
          ) : (
            <>
              <GitPullRequest className="mr-1.5 size-3.5" />
              Submit Pull Request
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
