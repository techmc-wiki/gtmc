"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { ExternalLink, GitPullRequest, Plus } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/shadcn/dialog"
import { Button } from "@/components/ui/shadcn/button"
import { Badge } from "@/components/ui/shadcn/badge"
import { GlossaryEditToolbar } from "@/components/glossary/glossary-edit-toolbar"
import {
  ComplexChangesNotice,
  AttributionWarning,
} from "@/components/glossary/glossary-notices"
import { GlossaryRowPicker } from "@/components/glossary/glossary-row-picker"
import {
  GlossaryEditCard,
  type GlossaryEditOperation,
} from "@/components/glossary/glossary-edit-card"
import { GlossaryDiffPreview } from "@/components/glossary/glossary-diff-preview"
import { useStatusNotification } from "@/hooks/use-status-notification"
import {
  deleteGlossaryDraftAction,
  updateGlossaryDraftAction,
} from "@/actions/glossary-draft"
import { useMounted } from "@/hooks/use-mounted"
import { submitGlossaryDraftAction } from "@/actions/glossary-submit"
import { GLOSSARY_COLUMNS, type GlossaryRow } from "@/lib/glossary/csv"
import { generateSlug } from "@/lib/glossary/slug"
import type {
  GlossaryEntry,
  GlossarySummaryEntry,
} from "@/lib/glossary/manifest"
import { LOCALE_TO_COLUMN, type GlossaryLocale } from "@/lib/glossary/locales"
import { useRouter } from "@/i18n/navigation"

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
  status?: string
  githubPrUrl?: string | null
  githubPrNum?: number | null
}

const SAVE_DEBOUNCE_MS = 2000

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

function applyPrefillToOperations(
  operations: GlossaryEditOperation[],
  prefillSlug: string | undefined,
  entriesBySlug: Map<string, GlossaryEntry>
): GlossaryEditOperation[] {
  if (!prefillSlug || operations.some((op) => op.slug === prefillSlug)) {
    return operations
  }
  const entry = entriesBySlug.get(prefillSlug)
  if (!entry) return operations
  const row = entryToRow(entry)
  return [
    ...operations,
    {
      kind: "edit",
      slug: entry.slug,
      before: row,
      after: { ...row },
    },
  ]
}

export function GlossaryEditor(props: GlossaryEditorProps) {
  const entriesBySlug = React.useMemo(() => {
    const map = new Map<string, GlossaryEntry>()
    for (const entry of props.manifestEntries) {
      map.set(entry.slug, entry)
    }
    return map
  }, [props.manifestEntries])

  const resolvedInitialOperations = React.useMemo(
    () =>
      applyPrefillToOperations(
        props.initialOperations,
        props.prefillSlug,
        entriesBySlug
      ),
    [props.initialOperations, props.prefillSlug, entriesBySlug]
  )

  return (
    <GlossaryEditorInner
      key={`${props.draftId}:${props.prefillSlug ?? ""}`}
      {...props}
      initialOperations={resolvedInitialOperations}
    />
  )
}

function GlossaryEditorInner({
  draftId,
  initialTitle,
  initialOperations,
  manifestEntries,
  summaryEntries,
  locale,
  authorName,
  noreplyEmail,
  realEmail,
  status = "DRAFT",
  githubPrUrl,
  githubPrNum,
}: GlossaryEditorProps) {
  const t = useTranslations("Glossary")
  const router = useRouter()
  const isMounted = useMounted()

  const isReadOnly = status === "SUBMITTED" || status === "PENDING"

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
  const [submitState, setSubmitState] = React.useState<
    "idle" | "running" | "success" | "error"
  >("idle")
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitResult, setSubmitResult] = React.useState<{
    prUrl: string
    prNumber: number
  } | null>(
    githubPrUrl && githubPrNum
      ? { prUrl: githubPrUrl, prNumber: githubPrNum }
      : null
  )

  const { badge, showBadge, clearBadge } = useStatusNotification()

  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const operationsRef = React.useRef(operations)
  const titleRef = React.useRef(title)
  operationsRef.current = operations
  titleRef.current = title

  const scheduleAutosave = React.useCallback(() => {
    if (isReadOnly) return
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    showBadge("SAVING…", "progress")
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await updateGlossaryDraftAction(
          draftId,
          operationsRef.current,
          titleRef.current
        )
        if (result.success) {
          showBadge("SAVED", "info", 2000)
        } else {
          const message =
            result.errors?.general ||
            result.errors?.operations?.join(", ") ||
            "SAVE FAILED"
          showBadge(message.toUpperCase(), "error", 3000)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "SAVE FAILED"
        showBadge(message.toUpperCase(), "error", 3000)
      }
    }, SAVE_DEBOUNCE_MS)
  }, [draftId, showBadge, isReadOnly])

  React.useEffect(
    () => () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    },
    []
  )

  const handleTitleChange = React.useCallback(
    (next: string) => {
      if (isReadOnly) return
      setTitle(next)
      scheduleAutosave()
    },
    [scheduleAutosave, isReadOnly]
  )

  const handlePick = React.useCallback(
    (slug: string) => {
      if (isReadOnly) return
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
      scheduleAutosave()
    },
    [entriesBySlug, scheduleAutosave, isReadOnly]
  )

  const usedSlugs = React.useMemo(() => {
    const set = new Set<string>()
    for (const entry of manifestEntries) set.add(entry.slug)
    for (const op of operations) set.add(op.slug)
    return set
  }, [manifestEntries, operations])

  const handleAddNew = React.useCallback(
    (query: string) => {
      if (isReadOnly) return
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
      scheduleAutosave()
    },
    [usedSlugs, scheduleAutosave, isReadOnly]
  )

  const handleAddNewTerm = React.useCallback(() => {
    if (isReadOnly) return
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
    scheduleAutosave()
  }, [usedSlugs, scheduleAutosave, isReadOnly])

  const handleOperationChange = React.useCallback(
    ({ slug, after }: { slug: string; after: GlossaryRow }) => {
      if (isReadOnly) return
      setOperations((prev) =>
        prev.map((op) => (op.slug === slug ? { ...op, after } : op))
      )
      scheduleAutosave()
    },
    [scheduleAutosave, isReadOnly]
  )

  const handleOperationRemove = React.useCallback(
    (slug: string) => {
      if (isReadOnly) return
      setOperations((prev) => prev.filter((op) => op.slug !== slug))
      scheduleAutosave()
    },
    [scheduleAutosave, isReadOnly]
  )

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
      const result = await deleteGlossaryDraftAction(draftId)
      if (result.success) {
        clearBadge()
        router.push("/draft")
      } else {
        showBadge(
          (result.error || "DELETE FAILED").toUpperCase(),
          "error",
          3000
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "DELETE FAILED"
      showBadge(message.toUpperCase(), "error", 3000)
    }
  }, [draftId, router, showBadge, clearBadge])

  const handleSubmit = React.useCallback(
    async ({ useRealEmail: useReal }: { useRealEmail: boolean }) => {
      if (isSubmitting) return
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      try {
        const saveRes = await updateGlossaryDraftAction(
          draftId,
          operations,
          title
        )
        if (!saveRes.success) {
          const message =
            saveRes.errors?.general ||
            saveRes.errors?.operations?.join(", ") ||
            "Failed to save draft before submitting"
          setSubmitError(message)
          return
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "SAVE FAILED"
        setSubmitError(message)
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
        if (result.success) {
          setSubmitState("success")
          setSubmitResult({ prUrl: result.prUrl, prNumber: result.prNumber })
        } else {
          setSubmitState("error")
          setSubmitError(result.error)
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Submission failed"
        setSubmitState("error")
        setSubmitError(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [draftId, operations, title, isSubmitting]
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

  const canSubmit = operations.length > 0 && !isReadOnly

  return (
    <div className="relative mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6 md:p-8">
      {status === "SUBMITTED" && githubPrUrl && (
        <div className="flex items-center justify-between gap-4 border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-2.5">
            <Badge variant="success">Submitted</Badge>
            <span className="text-foreground text-sm font-medium">
              This glossary draft was submitted as PR #{githubPrNum ?? ""}.
            </span>
          </div>
          <a
            href={githubPrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-tech-signal inline-flex items-center gap-1 font-mono text-xs font-bold tracking-wider uppercase hover:underline">
            View PR <ExternalLink className="size-3.5" />
          </a>
        </div>
      )}

      <GlossaryEditToolbar
        title={title}
        onTitleChange={handleTitleChange}
        onDiscard={handleDiscard}
        onSubmit={handleOpenPreview}
        canSubmit={canSubmit}
        saveState={saveStateLabel}
        isReadOnly={isReadOnly}
      />

      <ComplexChangesNotice />

      {!isReadOnly && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <GlossaryRowPicker
              entries={summaryEntries}
              onPick={handlePick}
              onAddNew={handleAddNew}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddNewTerm}
            className="h-10 shrink-0 text-xs font-medium">
            <Plus className="mr-1.5 size-3.5" />
            {t("editorAddTermButton")}
          </Button>
        </div>
      )}

      {operations.length === 0 ? (
        <div className="border-border bg-surface/30 rounded-none border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Search existing terms above to propose changes, or click &ldquo;Add
            term&rdquo; to create a new glossary entry. Changes are saved
            automatically.
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
                isReadOnly={isReadOnly}
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

      {showPreview && isMounted ? (
        <Dialog
          open={showPreview}
          onOpenChange={(open) => {
            if (!open) handleClosePreview()
          }}>
          <DialogContent
            showCloseButton={!isSubmitting}
            className="bg-surface border-border top-1/2 left-1/2 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden p-0">
            <DialogHeader className="border-border border-b p-4 sm:p-5">
              <DialogTitle className="text-foreground flex items-center gap-2 text-base font-semibold">
                <GitPullRequest className="text-tech-signal size-4" />
                {submitState === "success"
                  ? "Pull Request Submitted"
                  : t("editorPreviewDiff")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                {submitState === "success"
                  ? "Your glossary draft has been submitted to GitHub."
                  : t("editorPrOwnershipNotice")}
              </DialogDescription>
            </DialogHeader>

            <GlossaryDiffPreview
              operations={operations}
              onClose={handleClosePreview}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              validationMessage={submitError ?? undefined}
              canSubmit={!isSubmitting}
              authorName={authorName}
              noreplyEmail={noreplyEmail}
              realEmail={realEmail}
              submitState={submitState}
              submitResult={submitResult}
              onDismissSuccess={handleDismissSuccess}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
