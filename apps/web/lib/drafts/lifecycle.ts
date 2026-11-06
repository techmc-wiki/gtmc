import { createMachine, transition } from "xstate"

import type { Draft, DraftStatus } from "@/lib/drafts/store"

/**
 * The persisted draft lifecycle.
 *
 * The blob record only stores `DRAFT`, `PENDING`, and `SUBMITTED`. `MERGED`,
 * `CLOSED`, and `ARCHIVED` are terminal states that can also be derived from
 * GitHub pull-request state; they stay in the machine so the dashboard, editor,
 * and server actions share one vocabulary.
 */
export type DraftLifecycleEvent =
  | { type: "BEGIN_SUBMISSION" }
  | { type: "SUBMISSION_FAILED" }
  | { type: "SUBMISSION_SUCCEEDED" }
  | { type: "PR_MERGED" }
  | { type: "PR_CLOSED" }
  | { type: "ARCHIVE" }

const draftLifecycleMachine = createMachine({
  id: "draftLifecycle",
  types: {} as {
    context: Record<string, never>
    events: DraftLifecycleEvent
  },
  context: {},
  initial: "DRAFT",
  states: {
    DRAFT: {
      on: {
        BEGIN_SUBMISSION: "PENDING",
      },
    },
    PENDING: {
      on: {
        SUBMISSION_FAILED: "DRAFT",
        SUBMISSION_SUCCEEDED: "SUBMITTED",
      },
    },
    SUBMITTED: {
      on: {
        PR_MERGED: "MERGED",
        PR_CLOSED: "CLOSED",
        ARCHIVE: "ARCHIVED",
      },
    },
    MERGED: {},
    CLOSED: {},
    ARCHIVED: {},
  },
})

/**
 * Applies one lifecycle event, returning `null` when the transition is not
 * legal from `status`. Callers must treat `null` as a rejected operation.
 */
export function nextDraftStatus(
  status: DraftStatus,
  event: DraftLifecycleEvent
): DraftStatus | null {
  const snapshot = draftLifecycleMachine.resolveState({
    value: status,
    context: {},
  })
  if (!snapshot.can(event)) return null
  const [next] = transition(draftLifecycleMachine, snapshot, event)
  return next.value as DraftStatus
}

export function assertDraftStatus(
  status: DraftStatus,
  event: DraftLifecycleEvent
): DraftStatus {
  const next = nextDraftStatus(status, event)
  if (next === null) {
    throw new Error(`Draft cannot handle ${event.type} while ${status}`)
  }
  return next
}

export function isEditableDraftStatus(status: DraftStatus): boolean {
  return status === "DRAFT"
}

export function isSubmissionLocked(status: DraftStatus): boolean {
  return status === "PENDING"
}

export function isTerminalDraftStatus(status: DraftStatus): boolean {
  return (
    status === "SUBMITTED" ||
    status === "MERGED" ||
    status === "CLOSED" ||
    status === "ARCHIVED"
  )
}

export function isArchivedDraftStatus(status: DraftStatus): boolean {
  return status === "MERGED" || status === "CLOSED" || status === "ARCHIVED"
}

export function canEditDraft(draft: Draft): boolean {
  return isEditableDraftStatus(draft.status)
}

export function canDeleteDraft(draft: Draft): boolean {
  return isEditableDraftStatus(draft.status)
}

export function canUploadDraftAsset(draft: Draft): boolean {
  return draft.kind === "article" && canEditDraft(draft)
}

export function canSubmitDraft(draft: Draft): boolean {
  return draft.status === "DRAFT" || draft.status === "PENDING"
}

export interface PullRequestState {
  state: string
  merged: boolean
}

/**
 * Resolves the status shown in the dashboard without mutating storage. GitHub
 * is the source of truth once a PR exists, so a submitted draft can render as
 * MERGED/CLOSED while its blob record remains SUBMITTED.
 */
export function deriveDisplayStatus(
  status: DraftStatus,
  pr: PullRequestState | null | undefined
): DraftStatus {
  if (status === "SUBMITTED" && pr?.state === "closed") {
    return pr.merged ? "MERGED" : "CLOSED"
  }
  return status
}

export function canContinueDraft(displayStatus: DraftStatus): boolean {
  return displayStatus === "DRAFT"
}

export function canDeleteArticleDraft(
  draft: Draft,
  displayStatus: DraftStatus
): boolean {
  return (
    draft.status === "DRAFT" &&
    draft.githubPrNum === null &&
    displayStatus === "DRAFT"
  )
}
