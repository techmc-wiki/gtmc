import { nextDraftStatus } from "@/lib/drafts/lifecycle"
import { type Draft, writeDraft } from "@/lib/drafts/store"

export const SUBMISSION_TIMEOUT_MS = 15 * 60 * 1000

/** Thrown while another submission attempt still owns the draft lock. */
export class SubmissionInProgressError extends Error {
  constructor() {
    super(
      "Submission is still in progress. Retry shortly; interrupted submissions can be resumed after 15 minutes."
    )
    this.name = "SubmissionInProgressError"
  }
}

export interface SubmissionLock {
  draft: Draft
  etag: string
  recoverOnly: boolean
}

/**
 * Locks a DRAFT for submission, or recovers an earlier PENDING attempt.
 *
 * `recoverOnly` means a recent attempt may still be running: callers may look
 * for an existing PR but must not push another branch update.
 */
export async function lockSubmission(
  draft: Draft,
  etag: string
): Promise<SubmissionLock> {
  if (draft.status === "PENDING") {
    const ageMs = Date.now() - Date.parse(draft.updatedAt)
    if (ageMs < SUBMISSION_TIMEOUT_MS) {
      return { draft, etag, recoverOnly: true }
    }

    const pending = {
      ...draft,
      updatedAt: new Date().toISOString(),
    }
    return {
      draft: pending,
      etag: await writeDraft(pending, etag),
      recoverOnly: false,
    }
  }

  if (draft.status !== "DRAFT") {
    throw new Error("Only a draft can be submitted")
  }

  const status = nextDraftStatus(draft.status, { type: "BEGIN_SUBMISSION" })
  if (status === null) {
    throw new Error("Draft cannot begin submission")
  }

  const pending = {
    ...draft,
    status,
    branchName: draft.branchName || `${draft.kind}-draft-${draft.id}`,
    updatedAt: new Date().toISOString(),
  }
  return {
    draft: pending,
    etag: await writeDraft(pending, etag),
    recoverOnly: false,
  }
}

/**
 * Rolls a failed submission back to DRAFT when GitHub did not create a PR.
 * Keeping `branchName` makes the retry idempotent (the branch is reused).
 */
export async function releaseFailedSubmission(
  draft: Draft,
  etag: string
): Promise<{ draft: Draft; etag: string } | null> {
  if (draft.status !== "PENDING") return null

  const status = nextDraftStatus(draft.status, { type: "SUBMISSION_FAILED" })
  if (status === null) return null

  const released = {
    ...draft,
    status,
    updatedAt: new Date().toISOString(),
  }
  return { draft: released, etag: await writeDraft(released, etag) }
}
