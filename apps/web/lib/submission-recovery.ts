import {
  type DraftPullRequestResult,
  findArticlePullRequestByBranch,
} from "@/lib/articles/pr"
import { assertDraftStatus } from "@/lib/drafts/lifecycle"
import {
  type ArticleDraft,
  type Draft,
  readDraft,
  writeDraft,
} from "@/lib/drafts/store"
import { releaseFailedSubmission } from "@/lib/drafts/submission"
import {
  type GlossaryPrResult,
  findGlossaryPullRequestByBranch,
} from "@/lib/glossary/pr"

/** Pull request facts recovered from a submission attempt. */
export interface RecoveredSubmission {
  prNumber: number
  prUrl: string
}

/** An interrupted article attempt that may have opened a PR. */
interface ArticleSubmissionRecovery {
  kind: "article"
  authorId: string
  draftId: string
  token?: string
  /** A PR this attempt already opened; skips the lookup when present. */
  result?: DraftPullRequestResult
}

/** An interrupted glossary attempt that may have opened a PR. */
interface GlossarySubmissionRecovery {
  kind: "glossary"
  authorId: string
  draftId: string
  token: string
  /** A PR this attempt already opened; skips the lookup when present. */
  result?: GlossaryPrResult
}

type SubmissionRecovery = ArticleSubmissionRecovery | GlossarySubmissionRecovery

/** The article-specific fields an attempt resolved before it failed. */
type ArticleFiles = Pick<ArticleDraft, "activeFileId" | "files">

function pullRequestFacts(
  pullRequest: { number: number; html_url: string } | null
): RecoveredSubmission | null {
  return pullRequest
    ? { prNumber: pullRequest.number, prUrl: pullRequest.html_url }
    : null
}

function attachArticleFiles(
  draft: Draft,
  articleFiles: ArticleFiles | null
): Draft {
  if (draft.kind !== "article" || !articleFiles) return draft
  return {
    ...draft,
    activeFileId: articleFiles.activeFileId,
    files: articleFiles.files,
  }
}

/**
 * Resolves a PENDING submission attempt: finalizes the draft when the attempt
 * opened a PR, otherwise releases the lock so the author can retry.
 *
 * Returns the recovered pull request, or `null` when the draft is not PENDING
 * or no PR exists.
 */
export async function reconcileSubmission(
  recovery: SubmissionRecovery
): Promise<RecoveredSubmission | null> {
  const record = await readDraft(recovery.authorId, recovery.draftId)
  const draft = record?.draft
  if (!record || !draft || draft.status !== "PENDING" || !draft.branchName) {
    return null
  }
  const branchName = draft.branchName

  let submitted: RecoveredSubmission | null = null
  let articleFiles: ArticleFiles | null = null

  if (recovery.kind === "article") {
    if (draft.kind !== "article") return null
    submitted =
      recovery.result ??
      pullRequestFacts(
        await findArticlePullRequestByBranch(branchName, recovery.token)
      )
    articleFiles = recovery.result ?? {
      activeFileId: draft.activeFileId,
      files: draft.files,
    }
  } else {
    if (draft.kind !== "glossary") return null
    submitted =
      recovery.result ??
      pullRequestFacts(
        await findGlossaryPullRequestByBranch(branchName, recovery.token)
      )
  }

  if (!submitted) {
    await releaseFailedSubmission(draft, record.etag)
    return null
  }

  const now = new Date().toISOString()
  await writeDraft(
    {
      ...attachArticleFiles(draft, articleFiles),
      status: assertDraftStatus(draft.status, {
        type: "SUBMISSION_SUCCEEDED",
      }),
      githubPrNum: submitted.prNumber,
      githubPrUrl: submitted.prUrl,
      submittedAt: now,
      updatedAt: now,
    },
    record.etag
  )
  return submitted
}
