"use client"

import * as React from "react"
import { diffWords } from "diff"
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
}

function renderInlineDiff(oldText: string, newText: string): React.ReactNode {
  const changes = diffWords(oldText ?? "", newText ?? "")
  return changes.map((part, index) => {
    if (part.added) {
      return (
        <ins
          key={index}
          className="bg-green-100/50 px-0.5 text-green-800 no-underline">
          {part.value}
        </ins>
      )
    }
    if (part.removed) {
      return (
        <del
          key={index}
          className="bg-red-100/50 px-0.5 text-red-700 line-through">
          {part.value}
        </del>
      )
    }
    return <span key={index}>{part.value}</span>
  })
}

function changedColumns(
  before: GlossaryRow,
  after: GlossaryRow
): readonly (typeof GLOSSARY_COLUMNS)[number][] {
  return GLOSSARY_COLUMNS.filter(
    (col) => (before[col] ?? "") !== (after[col] ?? "")
  )
}

function populatedColumns(
  row: GlossaryRow
): readonly (typeof GLOSSARY_COLUMNS)[number][] {
  return GLOSSARY_COLUMNS.filter((col) => (row[col] ?? "").trim() !== "")
}

interface OperationCardProps {
  operation: GlossaryDiffOperation
}

function EditOperationCard({ operation }: OperationCardProps) {
  const before = operation.before ?? ({} as GlossaryRow)
  const after = operation.after ?? ({} as GlossaryRow)
  const fields = changedColumns(before, after)

  return (
    <article
      aria-label={`Edit ${operation.slug}`}
      className="border-tech-line/40 border-l-tech-main border border-l-4 bg-white/70 p-4 backdrop-blur-sm">
      <header className="mb-3 flex items-baseline gap-2 font-mono text-xs">
        <span className="text-tech-main font-bold tracking-widest uppercase">
          [EDIT]
        </span>
        <span className="text-tech-main-dark font-bold">{operation.slug}</span>
      </header>

      {fields.length === 0 ? (
        <p className="text-tech-main/60 font-mono text-xs italic">
          No field changes detected.
        </p>
      ) : (
        <dl className="flex flex-col gap-2 font-mono text-sm">
          {fields.map((field) => (
            <div key={field} className="flex flex-col gap-1">
              <dt className="text-tech-main/60 text-[0.7rem] tracking-widest uppercase">
                {field}
              </dt>
              <dd className="text-tech-main-dark leading-relaxed break-words whitespace-pre-wrap">
                {renderInlineDiff(before[field] ?? "", after[field] ?? "")}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  )
}

function AddOperationCard({ operation }: OperationCardProps) {
  const after = operation.after ?? ({} as GlossaryRow)
  const fields = populatedColumns(after)

  return (
    <article
      aria-label={`Add ${operation.slug}`}
      className="border-tech-line/40 border border-l-4 border-l-green-500/40 bg-white/70 p-4 backdrop-blur-sm">
      <header className="mb-3 flex items-baseline gap-2 font-mono text-xs">
        <span className="font-bold tracking-widest text-green-700 uppercase">
          [NEW TERM]
        </span>
        <span className="text-tech-main-dark font-bold">{operation.slug}</span>
      </header>

      {fields.length === 0 ? (
        <p className="text-tech-main/60 font-mono text-xs italic">Empty row.</p>
      ) : (
        <dl className="flex flex-col gap-1.5 font-mono text-sm">
          {fields.map((field) => (
            <div
              key={field}
              className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="text-tech-main/60 text-[0.7rem] tracking-widest uppercase sm:w-48 sm:shrink-0">
                {field}
              </dt>
              <dd className="text-tech-main-dark leading-relaxed break-words whitespace-pre-wrap">
                {after[field]}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  )
}

function DeleteOperationCard({ operation }: OperationCardProps) {
  const before = operation.before ?? ({} as GlossaryRow)
  const fields = populatedColumns(before)

  return (
    <article
      aria-label={`Delete ${operation.slug}`}
      className="border-tech-line/40 border border-l-4 border-l-red-700/40 bg-white/70 p-4 backdrop-blur-sm">
      <header className="mb-3 flex items-baseline gap-2 font-mono text-xs">
        <span className="font-bold tracking-widest text-red-700 uppercase">
          [TO BE DELETED]
        </span>
        <span className="text-tech-main-dark font-bold line-through">
          {operation.slug}
        </span>
      </header>

      {fields.length === 0 ? (
        <p className="text-tech-main/60 font-mono text-xs italic">Empty row.</p>
      ) : (
        <dl className="flex flex-col gap-1 font-mono text-sm opacity-50">
          {fields.map((field) => (
            <div
              key={field}
              className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="text-tech-main/70 text-[0.7rem] tracking-widest uppercase line-through sm:w-48 sm:shrink-0">
                {field}
              </dt>
              <dd className="text-tech-main-dark leading-relaxed break-words whitespace-pre-wrap line-through">
                {before[field]}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </article>
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
}: GlossaryDiffPreviewProps) {
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

  const submitDisabled = isSubmitting || !canSubmit || operations.length === 0

  return (
    <div
      className={cn(
        "border-tech-main/40 flex flex-col border bg-white/95 backdrop-blur-sm",
        className
      )}>
      <div
        role="status"
        aria-live="polite"
        className="border-tech-line/30 sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white/95 px-4 py-3 font-mono text-xs backdrop-blur-sm sm:px-6">
        <span className="text-tech-main-dark tracking-widest uppercase">
          {`Edit: ${counts.edit} / Add: ${counts.add} / Delete: ${counts.delete}`}
        </span>
        <span className="text-tech-main/60 tracking-widest uppercase">
          {`${operations.length} OP${operations.length === 1 ? "" : "S"}`}
        </span>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
        {operations.length === 0 ? (
          <p className="text-tech-main/60 font-mono text-sm italic">
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

      <div className="border-tech-line/30 bg-tech-bg/40 flex flex-col gap-3 border-t px-4 py-4 font-mono text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={useRealEmail}
            onChange={(event) => setUseRealEmail(event.target.checked)}
            disabled={isSubmitting}
            className="border-tech-main/60 accent-tech-main size-4 cursor-pointer disabled:cursor-not-allowed"
          />
          <span className="text-tech-main tracking-widest uppercase">
            USE REAL EMAIL
          </span>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          {validationMessage && !canSubmit ? (
            <span
              role="alert"
              className="text-xs tracking-widest text-red-700 uppercase">
              {validationMessage}
            </span>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-tech-main/70 hover:text-tech-main cursor-pointer text-xs tracking-widest uppercase underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50">
            Save &amp; continue editing
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
            aria-busy={isSubmitting}
            className="border-tech-main bg-tech-main hover:bg-tech-main-dark inline-flex min-h-[44px] cursor-pointer items-center justify-center border px-6 py-2 text-xs font-bold tracking-widest text-white uppercase transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Submitting…" : "Submit PR"}
          </button>
        </div>
      </div>
    </div>
  )
}
