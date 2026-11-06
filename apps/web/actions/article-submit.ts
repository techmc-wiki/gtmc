"use server"

import { createHash } from "node:crypto"
import path from "node:path"
import { revalidatePath } from "next/cache"
import {
  type DraftPullRequestResult,
  findArticlePullRequestByBranch,
  openDraftPullRequest,
} from "@/lib/articles/pr"
import { getMainBranchHeadSha } from "@/lib/articles/branch"
import { getAuthorIdentity, requireAuth } from "@/lib/auth/context"
import { getDuplicateDraftFilePaths } from "@/lib/drafts/files"
import { assertDraftStatus, canSubmitDraft } from "@/lib/drafts/lifecycle"
import { parseImageRefs, rewriteImageUrls } from "@/lib/drafts/markdown"
import {
  deleteDraftAssets,
  downloadDraftAsset,
  draftAssetPrefix,
} from "@/lib/drafts/storage"
import {
  draftErrorMessage,
  readDraft,
  requireDraftVersion,
  writeDraft,
} from "@/lib/drafts/store"
import {
  type SubmissionLock,
  lockSubmission,
  releaseFailedSubmission,
  SubmissionInProgressError,
} from "@/lib/drafts/submission"
import { getGitHubWriteToken } from "@/lib/github/articles-repo"

const UPLOAD_PLACEHOLDER_RE = /<!--\s*UPLOAD_PENDING_[a-f0-9-]+\s*-->/i

/**
 * Persists the outcome of a submission attempt that already opened (or may
 * have opened) a PR. If no PR exists, the draft lock is rolled back to DRAFT.
 */
async function reconcileSubmission(
  authorId: string,
  revisionId: string,
  token: string | undefined,
  result?: DraftPullRequestResult
): Promise<boolean> {
  const record = await readDraft(authorId, revisionId)
  if (!record || record.draft.kind !== "article") return false
  const draft = record.draft
  if (draft.status !== "PENDING" || !draft.branchName) return false

  const pullRequest =
    result ??
    (await findArticlePullRequestByBranch(draft.branchName, token).then((pr) =>
      pr
        ? {
            activeFileId: draft.activeFileId,
            files: draft.files,
            prNumber: pr.number,
            prUrl: pr.html_url,
          }
        : null
    ))

  if (!pullRequest) {
    await releaseFailedSubmission(draft, record.etag)
    return false
  }

  const now = new Date().toISOString()
  await writeDraft(
    {
      ...draft,
      activeFileId: pullRequest.activeFileId,
      files: pullRequest.files,
      status: assertDraftStatus(draft.status, {
        type: "SUBMISSION_SUCCEEDED",
      }),
      githubPrNum: pullRequest.prNumber,
      githubPrUrl: pullRequest.prUrl,
      submittedAt: now,
      updatedAt: now,
    },
    record.etag
  )
  return true
}

export async function submitDraftAction(revisionId: string, etag: string) {
  const session = await requireAuth()
  const record = await readDraft(session.user.id, revisionId)
  if (!record || record.draft.kind !== "article") {
    throw new Error("Draft not found")
  }
  const existing = record.draft
  if (existing.status === "SUBMITTED" && existing.githubPrNum) {
    return { success: true, status: existing.status }
  }
  if (!canSubmitDraft(existing)) {
    throw new Error("This draft can no longer be submitted")
  }

  // Every mutable state must match the version the caller saw. PENDING is
  // still mutable (a retry may finish it), so it cannot skip this check.
  requireDraftVersion(record.etag, etag)

  if (existing.files.some((file) => !file.filePath)) {
    throw new Error("Every file requires a file path before opening a PR")
  }
  const duplicates = getDuplicateDraftFilePaths(existing.files)
  if (duplicates.length) {
    throw new Error(`Duplicate file paths: ${duplicates.join(", ")}`)
  }
  if (existing.files.some((file) => UPLOAD_PLACEHOLDER_RE.test(file.content))) {
    throw new Error("Finish image uploads before opening a PR")
  }
  const token = getGitHubWriteToken()
  if (!token) {
    throw new Error("GitHub write access is not configured (GITHUB_TOKEN)")
  }
  const identity = await getAuthorIdentity(session)
  const prefix = draftAssetPrefix(session.user.id, revisionId)
  const refsByFile = existing.files.map((file) =>
    parseImageRefs(file.content, "draft-assets")
  )
  const paths = new Set(refsByFile.flat().map((ref) => ref.storagePath))
  const assets = await Promise.all(
    [...paths].map(async (storagePath) => {
      if (!storagePath.startsWith(prefix)) {
        throw new Error("An image belongs to another draft")
      }
      const content = await downloadDraftAsset(storagePath)
      return {
        id: storagePath,
        storagePath,
        filename: storagePath
          .slice(prefix.length)
          .replace(/^[a-f0-9-]{36}-/, ""),
        contentHash: createHash("sha256").update(content).digest("hex"),
        content,
      }
    })
  )
  const targetsByPath = new Map<string, string>()
  const files = existing.files.map((file, index) => {
    for (const ref of refsByFile[index]) {
      if (targetsByPath.has(ref.storagePath)) continue
      const asset = assets.find(
        (candidate) => candidate.storagePath === ref.storagePath
      )!
      const ext = path.posix.extname(asset.filename)
      const stem = asset.filename.slice(0, asset.filename.length - ext.length)
      targetsByPath.set(
        asset.storagePath,
        path.posix.join(
          path.posix.dirname(file.filePath),
          "img",
          `${stem}-${asset.contentHash.slice(0, 12)}${ext}`
        )
      )
    }
    const replacements = new Map(
      refsByFile[index].map((ref) => [
        ref.url,
        targetsByPath.get(ref.storagePath)!,
      ])
    )
    return {
      ...file,
      content: rewriteImageUrls(file.content, replacements),
    }
  })
  const imageEntries = [
    ...new Map(
      assets.map((asset) => [
        targetsByPath.get(asset.storagePath)!,
        { path: targetsByPath.get(asset.storagePath)!, content: asset.content },
      ])
    ).values(),
  ]
  const baseMainSha =
    existing.baseMainSha || (await getMainBranchHeadSha(token))

  let locked: SubmissionLock
  try {
    locked = await lockSubmission(existing, record.etag)
  } catch (error) {
    throw new Error(draftErrorMessage(error), { cause: error })
  }

  let result: DraftPullRequestResult
  try {
    result = await openDraftPullRequest({
      activeFileId: existing.activeFileId,
      branchName: locked.draft.branchName!,
      recoverOnly: locked.recoverOnly,
      authorName: identity.name,
      authorEmail: identity.email,
      files,
      imageEntries,
      title: existing.title,
      baseMainSha,
      token,
    })
  } catch (error) {
    // A recent in-flight attempt may still own the lock; never roll it back.
    // Every other failure releases the draft so the author can fix and retry.
    if (!(error instanceof SubmissionInProgressError)) {
      const recovered = await reconcileSubmission(
        session.user.id,
        revisionId,
        token
      ).catch((reconcileError) => {
        console.error("Failed to reconcile submission:", reconcileError)
        return false
      })
      if (recovered) return { success: true, status: "SUBMITTED" }
    }
    throw error
  }

  try {
    const now = new Date().toISOString()
    await writeDraft(
      {
        ...existing,
        activeFileId: result.activeFileId,
        files: result.files,
        baseMainSha,
        branchName: locked.draft.branchName,
        status: assertDraftStatus("PENDING", {
          type: "SUBMISSION_SUCCEEDED",
        }),
        githubPrNum: result.prNumber,
        githubPrUrl: result.prUrl,
        submittedAt: now,
        updatedAt: now,
      },
      locked.etag
    )
  } catch (error) {
    const recovered = await reconcileSubmission(
      session.user.id,
      revisionId,
      token,
      result
    ).catch((reconcileError) => {
      console.error("Failed to persist submitted draft:", reconcileError)
      return false
    })
    if (!recovered) {
      throw new Error(draftErrorMessage(error), { cause: error })
    }
  }

  try {
    await deleteDraftAssets(session.user.id, revisionId)
  } catch (error) {
    console.error("Submitted draft asset cleanup failed:", error)
  }
  revalidatePath("/draft")
  return { success: true, status: "SUBMITTED" }
}
