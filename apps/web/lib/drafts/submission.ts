import { type Draft, writeDraft } from "@/lib/drafts/store"

const SUBMISSION_TIMEOUT_MS = 15 * 60 * 1000

export async function lockSubmission(draft: Draft, etag: string) {
  const recoverOnly =
    draft.status === "PENDING" &&
    Date.now() - Date.parse(draft.updatedAt) < SUBMISSION_TIMEOUT_MS
  if (recoverOnly) return { draft, etag, recoverOnly }
  if (draft.status !== "DRAFT" && draft.status !== "PENDING") {
    throw new Error("Only a draft can be submitted")
  }
  const pending = {
    ...draft,
    status: "PENDING" as const,
    branchName: draft.branchName || `${draft.kind}-draft-${draft.id}`,
    updatedAt: new Date().toISOString(),
  }
  return {
    draft: pending,
    etag: await writeDraft(pending, etag),
    recoverOnly: false,
  }
}
