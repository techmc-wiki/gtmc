"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { ExternalLink, GitPullRequest, Plus } from "lucide-react"

import { IconButton } from "@/components/ui/icon-button"
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
import {
  useGlossaryEditor,
  type GlossarySubmitResult,
  type GlossarySubmitState,
  type UseGlossaryEditorOptions,
} from "@/components/glossary/use-glossary-editor"
import { useMounted } from "@/hooks/use-mounted"
import type { GlossaryRow } from "@/lib/glossary/csv"
import type {
  GlossaryEntry,
  GlossarySummaryEntry,
} from "@/lib/glossary/manifest"
import {
  findDanglingGlossaryRefs,
  glossaryEntryToRow,
} from "@/lib/glossary/rows"

export interface GlossaryEditorProps extends UseGlossaryEditorOptions {
  prefillSlug?: string
  summaryEntries: GlossarySummaryEntry[]
  locale: string
  authorName: string
  noreplyEmail: string
  realEmail: string | null
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
  const row = glossaryEntryToRow(entry)
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
      key={`${props.draftId}:${props.initialEtag}:${props.prefillSlug ?? ""}`}
      {...props}
      initialOperations={resolvedInitialOperations}
    />
  )
}

function GlossaryEditorInner(props: GlossaryEditorProps) {
  const t = useTranslations("Glossary")
  const { state, actions } = useGlossaryEditor(props)

  return (
    <>
      {state.status === "PENDING" && (
        <div className="space-y-2">
          <Button
            disabled={state.isSubmitting}
            onClick={() =>
              void actions.handleSubmit({ useRealEmail: state.useRealEmail })
            }>
            {t("resumeSubmission")}
          </Button>
          {state.submitError && <p role="alert">{state.submitError}</p>}
        </div>
      )}
      <GlossaryEditorContent
        authorName={props.authorName}
        githubPrNum={props.githubPrNum}
        githubPrUrl={props.githubPrUrl}
        handleAddNew={actions.handleAddNew}
        handleAddNewTerm={actions.handleAddNewTerm}
        handleClosePreview={actions.handleClosePreview}
        handleDismissSuccess={actions.handleDismissSuccess}
        handleDiscard={actions.handleDiscard}
        handleOpenPreview={actions.handleOpenPreview}
        handleOperationChange={actions.handleOperationChange}
        handleOperationMarkDelete={actions.handleOperationMarkDelete}
        handleOperationRemove={actions.handleOperationRemove}
        handlePick={actions.handlePick}
        handleSubmit={actions.handleSubmit}
        handleTitleChange={actions.handleTitleChange}
        hasInvalidOperations={state.hasInvalidOperations}
        isReadOnly={state.isReadOnly}
        isSaving={state.isSaving}
        locale={props.locale}
        manifestEntries={props.manifestEntries}
        noreplyEmail={props.noreplyEmail}
        operations={state.operations}
        realEmail={props.realEmail}
        showPreview={state.showPreview}
        status={state.status}
        submitError={state.submitError}
        submitResult={state.submitResult}
        submitState={state.submitState}
        summaryEntries={props.summaryEntries}
        title={state.title}
        useRealEmail={state.useRealEmail}
        onUseRealEmailChange={actions.setUseRealEmail}
      />
    </>
  )
}

interface GlossaryEditorContentProps {
  authorName: string
  githubPrNum: number | null | undefined
  githubPrUrl: string | null | undefined
  handleAddNew: (query: string) => void
  handleAddNewTerm: () => void
  handleClosePreview: () => void
  handleDismissSuccess: () => void
  handleDiscard: () => void
  handleOpenPreview: () => void
  handleOperationChange: (input: { slug: string; after: GlossaryRow }) => void
  handleOperationMarkDelete: (slug: string) => void
  handleOperationRemove: (slug: string) => void
  handlePick: (slug: string) => void
  handleSubmit: (input: { useRealEmail: boolean }) => Promise<void>
  handleTitleChange: (title: string) => void
  hasInvalidOperations: boolean
  isReadOnly: boolean
  isSaving: boolean
  locale: string
  manifestEntries: GlossaryEntry[]
  noreplyEmail: string
  operations: GlossaryEditOperation[]
  onUseRealEmailChange: (value: boolean) => void
  realEmail: string | null
  showPreview: boolean
  status: string
  submitError: string | null
  submitResult: GlossarySubmitResult | null
  submitState: GlossarySubmitState
  summaryEntries: GlossarySummaryEntry[]
  title: string
  useRealEmail: boolean
}

function GlossaryEditorContent({
  authorName,
  githubPrNum,
  githubPrUrl,
  handleAddNew,
  handleAddNewTerm,
  handleClosePreview,
  handleDismissSuccess,
  handleDiscard,
  handleOpenPreview,
  handleOperationChange,
  handleOperationMarkDelete,
  handleOperationRemove,
  handlePick,
  handleSubmit,
  handleTitleChange,
  hasInvalidOperations,
  isReadOnly,
  isSaving,
  locale,
  manifestEntries,
  noreplyEmail,
  operations,
  onUseRealEmailChange,
  realEmail,
  showPreview,
  status,
  submitError,
  submitResult,
  submitState,
  summaryEntries,
  title,
  useRealEmail,
}: GlossaryEditorContentProps) {
  const t = useTranslations("Glossary")
  const isMounted = useMounted()
  const isSubmitting = submitState === "running"
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
        canSubmit={operations.length > 0 && !hasInvalidOperations}
        isSaving={isSaving}
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
          <IconButton
            type="button"
            variant="outline"
            onClick={handleAddNewTerm}
            className="shrink-0"
            label={t("editorAddTermButton")}>
            <Plus aria-hidden />
          </IconButton>
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
          {operations.map((operation) => {
            const headerEnglish =
              operation.before?.["Full Form (English)"] ??
              operation.after?.["Full Form (English)"] ??
              operation.slug
            const danglingRefs =
              operation.kind === "delete"
                ? findDanglingGlossaryRefs(
                    operation.slug,
                    headerEnglish,
                    manifestEntries
                  )
                : undefined
            return (
              <GlossaryEditCard
                key={operation.slug}
                operation={operation}
                locale={locale}
                onChange={handleOperationChange}
                onMarkDelete={handleOperationMarkDelete}
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
        onUseRealEmailChange={onUseRealEmailChange}
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
              validationMessage={
                hasInvalidOperations
                  ? t("invalidOperations")
                  : (submitError ?? undefined)
              }
              canSubmit={!isSubmitting && !hasInvalidOperations}
              authorName={authorName}
              noreplyEmail={noreplyEmail}
              realEmail={realEmail}
              useRealEmail={useRealEmail}
              onUseRealEmailChange={onUseRealEmailChange}
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
