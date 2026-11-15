"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import { toast } from "sonner"

import { deleteGlossaryDraftAction, updateGlossaryDraftAction } from "@/actions/glossary-draft"
import { submitGlossaryDraftAction } from "@/actions/glossary-submit"
import type { GlossaryEditOperation } from "@/components/glossary/glossary-edit-card"
import { useRouter } from "@/i18n/navigation"
import type { GlossaryRow } from "@/lib/glossary/csv"
import type { GlossaryEntry } from "@/lib/glossary/manifest"
import { emptyGlossaryRow, glossaryEntryToRow } from "@/lib/glossary/rows"
import { generateUniqueSlug } from "@/lib/glossary/slug"

const SAVE_DEBOUNCE_MS = 2000

export type GlossarySubmitState = "idle" | "running" | "success" | "error"

export interface GlossarySubmitResult {
  prUrl: string
  prNumber: number
}

export interface GlossarySaveDraftResult {
  success: boolean
  etag?: string
  errors?: { operations?: string[]; general?: string }
}

export type GlossarySaveDraft = (
  id: string,
  operations: GlossaryEditOperation[],
  title: string,
) => Promise<GlossarySaveDraftResult>

export interface UseGlossaryEditorOptions {
  draftId: string
  initialEtag: string
  initialTitle: string
  initialOperations: GlossaryEditOperation[]
  manifestEntries: GlossaryEntry[]
  status?: string
  githubPrUrl?: string | null
  githubPrNum?: number | null
}

/**
 * Serializes draft saves: each save waits for the previous one so the stored
 * etag always reflects the write that actually landed.
 */
function useGlossarySaveQueue(initialEtag: string) {
  const etagRef = React.useRef(initialEtag)
  const queueRef = React.useRef(Promise.resolve())

  const saveDraft = React.useCallback(
    (id: string, operations: GlossaryEditOperation[], title: string) => {
      const result = queueRef.current.then(async () => {
        const saved = await updateGlossaryDraftAction(id, operations, title, etagRef.current)
        if (saved.etag) etagRef.current = saved.etag
        return saved
      })
      queueRef.current = result.then(
        () => undefined,
        () => undefined,
      )
      return result
    },
    [],
  )

  return { etagRef, saveDraft }
}

function useGlossaryAutosave({
  saveDraft,
  draftId,
  isReadOnly,
  operations,
  title,
}: {
  draftId: string
  isReadOnly: boolean
  saveDraft: GlossarySaveDraft
  operations: GlossaryEditOperation[]
  title: string
}) {
  const [isSaving, setIsSaving] = React.useState(false)
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const operationsRef = React.useRef(operations)
  const titleRef = React.useRef(title)

  React.useEffect(() => {
    operationsRef.current = operations
    titleRef.current = title
  }, [operations, title])

  const scheduleAutosave = React.useCallback(() => {
    if (isReadOnly) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    const savingToastId = toast.loading("Saving…", { id: "glossary-autosave" })
    setIsSaving(true)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await saveDraft(draftId, operationsRef.current, titleRef.current)
        if (result.success) {
          toast.success("Saved", { id: savingToastId })
          setTimeout(() => setIsSaving(false), 2000)
          return
        }
        const message =
          result.errors?.general ||
          Object.values(result.errors ?? {}).find(Boolean) ||
          "Save failed"
        toast.error(message, { id: savingToastId, duration: 3000 })
        setIsSaving(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed", {
          id: savingToastId,
          duration: 3000,
        })
        setIsSaving(false)
      }
    }, SAVE_DEBOUNCE_MS)
  }, [draftId, isReadOnly, saveDraft])

  React.useEffect(
    () => () => {
      clearTimeout(saveTimeoutRef.current)
    },
    [],
  )

  return { isSaving, saveTimeoutRef, scheduleAutosave }
}

/** Draft state and mutations for the glossary editor. */
export function useGlossaryEditor({
  draftId,
  initialEtag,
  initialTitle,
  initialOperations,
  manifestEntries,
  status = "DRAFT",
  githubPrUrl,
  githubPrNum,
}: UseGlossaryEditorOptions) {
  const t = useTranslations("Glossary")
  const router = useRouter()
  const { etagRef, saveDraft } = useGlossarySaveQueue(initialEtag)
  const isReadOnly = status !== "DRAFT"

  const entriesBySlug = React.useMemo(() => {
    const map = new Map<string, GlossaryEntry>()
    for (const entry of manifestEntries) {
      map.set(entry.slug, entry)
    }
    return map
  }, [manifestEntries])

  const [title, setTitle] = React.useState(initialTitle)
  const [operations, setOperations] = React.useState<GlossaryEditOperation[]>(initialOperations)
  const [showPreview, setShowPreview] = React.useState(false)
  const [useRealEmail, setUseRealEmail] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitState, setSubmitState] = React.useState<GlossarySubmitState>("idle")
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submitResult, setSubmitResult] = React.useState<GlossarySubmitResult | null>(
    githubPrUrl && githubPrNum ? { prUrl: githubPrUrl, prNumber: githubPrNum } : null,
  )

  const { isSaving, saveTimeoutRef, scheduleAutosave } = useGlossaryAutosave({
    draftId,
    isReadOnly,
    operations,
    title,
    saveDraft,
  })

  const hasInvalidOperations = operations.some(
    (op) => op.kind !== "delete" && !(op.after?.["Full Form (English)"] ?? "").trim(),
  )

  const handleTitleChange = React.useCallback(
    (next: string) => {
      if (isReadOnly) return
      setTitle(next)
      scheduleAutosave()
    },
    [scheduleAutosave, isReadOnly],
  )

  const handlePick = React.useCallback(
    (slug: string) => {
      if (isReadOnly) return
      const entry = entriesBySlug.get(slug)
      if (!entry) return
      const row = glossaryEntryToRow(entry)
      setOperations((prev) => {
        if (prev.some((op) => op.slug === slug)) return prev
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
    [entriesBySlug, scheduleAutosave, isReadOnly],
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
      const slug = generateUniqueSlug(trimmed, new Set(usedSlugs))
      const row = emptyGlossaryRow()
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
    [usedSlugs, scheduleAutosave, isReadOnly],
  )

  const handleAddNewTerm = React.useCallback(() => {
    if (isReadOnly) return
    const slug = generateUniqueSlug("new-term", new Set(usedSlugs))
    const row = emptyGlossaryRow()
    setOperations((prev) => [
      ...prev,
      {
        kind: "add",
        slug,
        after: row,
      },
    ])
    scheduleAutosave()
  }, [usedSlugs, scheduleAutosave, isReadOnly])

  const handleOperationChange = React.useCallback(
    ({ slug, after }: { slug: string; after: GlossaryRow }) => {
      if (isReadOnly) return
      setOperations((prev) => prev.map((op) => (op.slug === slug ? { ...op, after } : op)))
      scheduleAutosave()
    },
    [scheduleAutosave, isReadOnly],
  )

  const handleOperationMarkDelete = React.useCallback(
    (slug: string) => {
      if (isReadOnly) return
      setOperations((prev) =>
        prev.map((op) =>
          op.slug === slug && op.kind === "edit" ? { kind: "delete", slug, before: op.before } : op,
        ),
      )
      scheduleAutosave()
    },
    [scheduleAutosave, isReadOnly],
  )

  const handleOperationRemove = React.useCallback(
    (slug: string) => {
      if (isReadOnly) return
      setOperations((prev) => prev.filter((op) => op.slug !== slug))
      scheduleAutosave()
    },
    [scheduleAutosave, isReadOnly],
  )

  const handleDiscard = React.useCallback(async () => {
    const confirmed = window.confirm("Discard this draft? This cannot be undone.")
    if (!confirmed) return
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = undefined
    }
    try {
      const result = await deleteGlossaryDraftAction(draftId)
      if (result.success) {
        router.push("/draft")
      } else {
        toast.error(result.error || "Delete failed", { duration: 3000 })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed"
      toast.error(message, { duration: 3000 })
    }
  }, [draftId, router, saveTimeoutRef])

  const handleSubmit = React.useCallback(
    async ({ useRealEmail: useReal }: { useRealEmail: boolean }) => {
      if (isSubmitting) return
      if (hasInvalidOperations) {
        setSubmitError(t("invalidOperations"))
        return
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = undefined
      }
      try {
        if (status === "DRAFT") {
          const saveRes = await saveDraft(draftId, operations, title)
          if (!saveRes.success) {
            const message =
              saveRes.errors?.general ||
              saveRes.errors?.operations?.join(", ") ||
              "Failed to save draft before submitting"
            setSubmitError(message)
            return
          }
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
          etag: etagRef.current,
        })
        if (result.success) {
          setSubmitState("success")
          setSubmitResult({ prUrl: result.prUrl, prNumber: result.prNumber })
        } else {
          setSubmitState("error")
          setSubmitError(result.error)
          router.refresh()
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Submission failed"
        setSubmitState("error")
        setSubmitError(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      draftId,
      operations,
      title,
      isSubmitting,
      hasInvalidOperations,
      saveTimeoutRef,
      saveDraft,
      etagRef,
      status,
      router,
      t,
    ],
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

  return {
    state: {
      status,
      isReadOnly,
      title,
      operations,
      showPreview,
      useRealEmail,
      isSubmitting,
      submitState,
      submitError,
      submitResult,
      isSaving,
      hasInvalidOperations,
    },
    actions: {
      setUseRealEmail,
      handleTitleChange,
      handlePick,
      handleAddNew,
      handleAddNewTerm,
      handleOperationChange,
      handleOperationMarkDelete,
      handleOperationRemove,
      handleDiscard,
      handleSubmit,
      handleDismissSuccess,
      handleOpenPreview,
      handleClosePreview,
    },
  }
}
