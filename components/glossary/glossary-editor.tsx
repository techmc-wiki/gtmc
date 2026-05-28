"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { GlossaryEditToolbar } from "@/components/glossary/glossary-edit-toolbar"
import { ComplexChangesNotice } from "@/components/glossary/complex-changes-notice"
import { GlossaryRowPicker } from "@/components/glossary/glossary-row-picker"
import { GlossaryEditCard } from "@/components/glossary/glossary-edit-card"
import { GlossaryDiffPreview } from "@/components/glossary/glossary-diff-preview"
import { AttributionWarning } from "@/components/glossary/attribution-warning"
import {
  OperationProgress,
  type OperationProgressState,
  type OperationProgressStage,
} from "@/components/ui/operation-progress"
import { useStatusNotification } from "@/hooks/use-status-notification"
import {
  deleteGlossaryDraftAction,
  updateGlossaryDraftAction,
} from "@/actions/glossary-draft"
import { submitGlossaryDraftAction } from "@/actions/glossary-submit"
import { GLOSSARY_COLUMNS, type GlossaryRow } from "@/lib/glossary/csv"
import { generateSlug } from "@/lib/glossary/slug"
import type {
  GlossaryEntry,
  GlossarySummaryEntry,
  GlossaryLocale,
} from "@/lib/glossary/manifest"
import { LOCALE_TO_COLUMN } from "@/lib/glossary/locales"
import { useRouter } from "@/i18n/navigation"

export type GlossaryEditOperationKind = "edit" | "add" | "delete"

export interface GlossaryEditOperation {
  kind: GlossaryEditOperationKind
  slug: string
  before?: GlossaryRow
  after?: GlossaryRow
}

export interface GlossaryEditorProps {
  draftId: string
  initialTitle: string
  initialOperations: GlossaryEditOperation[]
  prefillSlug?: string
  manifestEntries: GlossaryEntry[]
  summaryEntries: GlossarySummaryEntry[]
  locale: string
  authorName: string
  noreplyEmail: string
  realEmail: string | null
}

const SAVE_DEBOUNCE_MS = 2000

const SUBMIT_STAGES: OperationProgressStage[] = [
  { id: "fetch", label: "FETCH UPSTREAM CSV", durationMs: 1500 },
  { id: "merge", label: "APPLY OPERATIONS", durationMs: 800 },
  { id: "branch", label: "OPEN PULL REQUEST", durationMs: 3000 },
]

function emptyRow(): GlossaryRow {
  const row = {} as GlossaryRow
  for (const col of GLOSSARY_COLUMNS) {
    row[col] = ""
  }
  return row
}

function entryToRow(entry: GlossaryEntry): GlossaryRow {
  const row = emptyRow()
  row["Full Form (English)"] = entry.fullFormEn
  row["Short Form"] = entry.shortForm
  row["Category"] = entry.category
  row["Regex"] = entry.regex
  row["Description"] = entry.isControversial
    ? `${entry.description}*`
    : entry.description
  row["Related"] = entry.related

  for (const code of Object.keys(LOCALE_TO_COLUMN) as GlossaryLocale[]) {
    const translation = entry.translations[code]
    if (translation) {
      const { termColumn, descColumn } = LOCALE_TO_COLUMN[code]
      row[termColumn as keyof GlossaryRow] = translation.value
      row[descColumn as keyof GlossaryRow] = translation.description
    }
  }
  return row
}

function findDanglingRefsFor(
  slug: string,
  fullFormEn: string,
  entries: GlossaryEntry[]
): { slug: string; fullFormEn: string }[] {
  const fullFormLower = fullFormEn.trim().toLowerCase()
  const found: { slug: string; fullFormEn: string }[] = []
  for (const entry of entries) {
    if (entry.slug === slug) continue
    if (!entry.related) continue
    const tokens = new Set(
      entry.related
        .split(/\s+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean)
    )
    if (tokens.has(slug) || (fullFormLower && tokens.has(fullFormLower))) {
      found.push({ slug: entry.slug, fullFormEn: entry.fullFormEn })
    }
  }
  return found
}

export function GlossaryEditor({
  draftId,
  initialTitle,
  initialOperations,
  prefillSlug,
  manifestEntries,
  summaryEntries,
  locale,
  authorName,
  noreplyEmail,
  realEmail,
}: GlossaryEditorProps) {
  const t = useTranslations("Glossary")
  const router = useRouter()

  const entriesBySlug = React.useMemo(() => {
    const map = new Map<string, GlossaryEntry>()
    for (const entry of manifestEntries) {
      map.set(entry.slug, entry)
    }
    return map
  }, [manifestEntries])

  const [title, setTitle] = React.useState(initialTitle)
  const [operations, setOperations] =
    React.useState<GlossaryEditOperation[]>(initialOperations)
  const [showPreview, setShowPreview] = React.useState(false)
  const [useRealEmail, setUseRealEmail] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitState, setSubmitState] =
    React.useState<OperationProgressState>("idle")
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitResult, setSubmitResult] = React.useState<{
    prUrl: string
    prNumber: number
  } | null>(null)

  const { badge, showBadge, clearBadge } = useStatusNotification()

  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const isFirstRunRef = React.useRef(true)
  const prefillAppliedRef = React.useRef(false)

  React.useEffect(() => {
    if (prefillAppliedRef.current) return
    if (!prefillSlug) {
      prefillAppliedRef.current = true
      return
    }
    if (operations.some((op) => op.slug === prefillSlug)) {
      prefillAppliedRef.current = true
      return
    }
    const entry = entriesBySlug.get(prefillSlug)
    if (!entry) {
      prefillAppliedRef.current = true
      return
    }
    const row = entryToRow(entry)
    setOperations((prev) => [
      ...prev,
      {
        kind: "edit",
        slug: entry.slug,
        before: row,
        after: { ...row },
      },
    ])
    prefillAppliedRef.current = true
  }, [prefillSlug, entriesBySlug, operations])

  React.useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false
      return
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    showBadge("SAVING…", "progress")
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateGlossaryDraftAction(draftId, operations)
        showBadge("SAVED", "info", 2000)
      } catch (error) {
        const message = error instanceof Error ? error.message : "SAVE FAILED"
        showBadge(message.toUpperCase(), "error", 3000)
      }
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [operations, title, draftId, showBadge])

  const handlePick = React.useCallback(
    (slug: string) => {
      const entry = entriesBySlug.get(slug)
      if (!entry) return
      setOperations((prev) => {
        if (prev.some((op) => op.slug === slug)) return prev
        const row = entryToRow(entry)
        return [
          ...prev,
          {
            kind: "edit",
            slug,
            before: row,
            after: { ...row },
          },
        ]
      })
    },
    [entriesBySlug]
  )

  const usedSlugs = React.useMemo(() => {
    const set = new Set<string>()
    for (const entry of manifestEntries) set.add(entry.slug)
    for (const op of operations) set.add(op.slug)
    return set
  }, [manifestEntries, operations])

  const handleAddNew = React.useCallback(
    (query: string) => {
      const trimmed = query.trim()
      if (!trimmed) return
      const baseSlug = generateSlug(trimmed)
      let slug = baseSlug
      let counter = 2
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`
        counter++
      }
      const row = emptyRow()
      row["Full Form (English)"] = trimmed
      setOperations((prev) => [
        ...prev,
        {
          kind: "add",
          slug,
          after: row,
        },
      ])
    },
    [usedSlugs]
  )

  const handleAddNewTerm = React.useCallback(() => {
    const baseSlug = "new-term"
    let slug = baseSlug
    let counter = 2
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`
      counter++
    }
    setOperations((prev) => [
      ...prev,
      {
        kind: "add",
        slug,
        after: emptyRow(),
      },
    ])
  }, [usedSlugs])

  const handleOperationChange = React.useCallback(
    ({ slug, after }: { slug: string; after: GlossaryRow }) => {
      setOperations((prev) =>
        prev.map((op) => (op.slug === slug ? { ...op, after } : op))
      )
    },
    []
  )

  const handleOperationRemove = React.useCallback((slug: string) => {
    setOperations((prev) => prev.filter((op) => op.slug !== slug))
  }, [])

  const handleDiscard = React.useCallback(async () => {
    const confirmed = window.confirm(
      "Discard this draft? This cannot be undone."
    )
    if (!confirmed) return
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    try {
      await deleteGlossaryDraftAction(draftId)
      clearBadge()
      router.push("/draft")
    } catch (error) {
      const message = error instanceof Error ? error.message : "DELETE FAILED"
      showBadge(message.toUpperCase(), "error", 3000)
    }
  }, [draftId, router, showBadge, clearBadge])

  const handleSubmit = React.useCallback(
    async ({ useRealEmail: useReal }: { useRealEmail: boolean }) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      try {
        await updateGlossaryDraftAction(draftId, operations)
      } catch (error) {
        const message = error instanceof Error ? error.message : "SAVE FAILED"
        showBadge(message.toUpperCase(), "error", 3000)
        return
      }

      setIsSubmitting(true)
      setSubmitState("running")
      setSubmitError(null)
      setSubmitResult(null)
      try {
        const result = await submitGlossaryDraftAction(draftId, {
          useRealEmail: useReal,
        })
        setSubmitState("success")
        setSubmitResult(result)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Submission failed"
        setSubmitState("error")
        setSubmitError(message)
        setIsSubmitting(false)
      }
    },
    [draftId, operations, showBadge]
  )

  const handleDismissSuccess = React.useCallback(() => {
    setIsSubmitting(false)
    setShowPreview(false)
    setSubmitState("idle")
    router.push("/draft")
  }, [router])

  const handleOpenPreview = React.useCallback(() => {
    setShowPreview(true)
  }, [])

  const handleClosePreview = React.useCallback(() => {
    if (isSubmitting) return
    setShowPreview(false)
    setSubmitState("idle")
    setSubmitError(null)
  }, [isSubmitting])

  const saveStateLabel = badge?.message ?? ""

  const canPreview = operations.length > 0
  const canSubmit = operations.length > 0

  return (
    <div className="relative mx-auto flex max-w-[1100px] flex-col gap-6 p-4 md:p-8">
      <GlossaryEditToolbar
        title={title}
        onTitleChange={setTitle}
        onDiscard={handleDiscard}
        onPreview={handleOpenPreview}
        onSubmit={handleOpenPreview}
        canPreview={canPreview}
        canSubmit={canSubmit}
        saveState={saveStateLabel}
      />

      <ComplexChangesNotice />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <div className="flex-1">
          <GlossaryRowPicker
            entries={summaryEntries}
            onPick={handlePick}
            onAddNew={handleAddNew}
          />
        </div>
        <button
          type="button"
          onClick={handleAddNewTerm}
          className="border-tech-main/40 text-tech-main-dark hover:bg-tech-main tracking-tech-wide cursor-pointer border bg-white/50 px-4 py-2 font-mono text-xs uppercase transition-colors hover:text-white">
          [+ ADD NEW TERM]
        </button>
      </div>

      {operations.length === 0 ? (
        <div className="border-tech-line/20 border bg-white/50 p-8 text-center">
          <p className="text-tech-main/50 font-mono text-xs tracking-widest">
            Add terms using the search above or create new ones. Changes are
            saved automatically.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {operations.map((op) => {
            const headerEnglish =
              op.before?.["Full Form (English)"] ??
              op.after?.["Full Form (English)"] ??
              op.slug
            const danglingRefs =
              op.kind === "delete"
                ? findDanglingRefsFor(op.slug, headerEnglish, manifestEntries)
                : undefined
            return (
              <GlossaryEditCard
                key={op.slug}
                operation={op}
                locale={locale}
                onChange={handleOperationChange}
                onRemove={handleOperationRemove}
                danglingRefs={danglingRefs}
              />
            )
          })}
        </div>
      )}

      <AttributionWarning
        authorName={authorName}
        githubNoreplyEmail={noreplyEmail}
        realEmail={realEmail}
        useRealEmail={useRealEmail}
        onUseRealEmailChange={setUseRealEmail}
      />

      {showPreview ? (
        <dialog
          open
          aria-modal="true"
          aria-label={t("editorPreviewDiff")}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8">
          <div className="flex w-full max-w-4xl flex-col gap-4">
            {submitState === "success" && submitResult ? (
              <div className="border-tech-main/40 flex flex-col gap-3 border bg-white/95 p-6 backdrop-blur-sm">
                <p className="text-tech-main/60 font-mono text-[10px] tracking-widest uppercase">
                  [SUBMITTED]
                </p>
                <p className="text-tech-main-dark font-mono text-base">
                  PR #{submitResult.prNumber} opened.{" "}
                  <a
                    href={submitResult.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tech-accent underline decoration-dotted underline-offset-4">
                    View on GitHub ↗
                  </a>
                </p>
                <p className="text-tech-main text-sm leading-relaxed">
                  {t("editorPrOwnershipBody")}
                </p>
                <button
                  type="button"
                  onClick={handleDismissSuccess}
                  className="border-tech-main bg-tech-main hover:bg-tech-main-dark mt-2 cursor-pointer self-end border px-6 py-2 font-mono text-xs font-bold tracking-widest text-white uppercase transition-colors">
                  Return to drafts
                </button>
              </div>
            ) : (
              <GlossaryDiffPreview
                operations={operations}
                onClose={handleClosePreview}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                validationMessage={submitError ?? undefined}
                canSubmit={!submitError}
              />
            )}

            {submitState !== "idle" && submitState !== "success" ? (
              <OperationProgress
                state={submitState}
                title="Submitting glossary changes"
                stages={SUBMIT_STAGES}
                successLabel="PR OPENED"
                errorLabel={submitError ?? "Submission failed"}
              />
            ) : null}
          </div>
        </dialog>
      ) : null}
    </div>
  )
}
