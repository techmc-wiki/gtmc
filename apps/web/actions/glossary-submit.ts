"use server"

import { revalidatePath } from "next/cache"

import { getAuthorIdentity, requireAuth } from "@/lib/auth/context"
import { assertDraftStatus, canSubmitDraft } from "@/lib/drafts/lifecycle"
import { readDraft, requireDraftVersion, writeDraft } from "@/lib/drafts/store"
import {
  lockSubmission,
  releaseFailedSubmission,
  SubmissionInProgressError,
} from "@/lib/drafts/submission"
import { parseGlossaryCsv, serializeGlossaryCsv } from "@/lib/glossary/csv"
import {
  type GlossaryPrResult,
  findGlossaryPullRequestByBranch,
  openGlossaryPullRequest,
} from "@/lib/glossary/pr"
import { getFileSnapshot } from "@/lib/github/branch"
import { generateSlug } from "@/lib/glossary/slug"
import { GLOSSARY_FORK_REPO, GLOSSARY_REPO } from "@/lib/github/repos"
import { resolveGithubToken } from "@/lib/github/tokens"

const GLOSSARY_MAIN_BRANCH = "main"
const GLOSSARY_CSV_PATH = "TechMC Glossary.csv"

export type SubmitGlossaryResult =
  | { success: true; prUrl: string; prNumber: number }
  | { success: false; error: string }

interface GlossaryPrOutcome {
  prUrl: string
  prNumber: number
}

/** Finalizes a PENDING attempt when a PR exists, otherwise unlocks the draft. */
async function reconcileSubmission(
  authorId: string,
  id: string,
  token: string,
  outcome?: GlossaryPrOutcome
): Promise<GlossaryPrOutcome | null> {
  const record = await readDraft(authorId, id)
  if (!record || record.draft.kind !== "glossary") return null
  const draft = record.draft
  if (draft.status !== "PENDING" || !draft.branchName) return null

  const pullRequest =
    outcome ??
    (await findGlossaryPullRequestByBranch(draft.branchName, token).then(
      (pr) => (pr ? { prUrl: pr.html_url, prNumber: pr.number } : null)
    ))

  if (!pullRequest) {
    await releaseFailedSubmission(draft, record.etag)
    return null
  }

  const now = new Date().toISOString()
  await writeDraft(
    {
      ...draft,
      status: assertDraftStatus(draft.status, {
        type: "SUBMISSION_SUCCEEDED",
      }),
      githubPrUrl: pullRequest.prUrl,
      githubPrNum: pullRequest.prNumber,
      submittedAt: now,
      updatedAt: now,
    },
    record.etag
  )
  return pullRequest
}

export async function submitGlossaryDraftAction(
  id: string,
  opts: { useRealEmail?: boolean; etag: string }
): Promise<SubmitGlossaryResult> {
  try {
    const session = await requireAuth()

    const record = await readDraft(session.user.id, id)
    if (!record || record.draft.kind !== "glossary") {
      return { success: false, error: "Draft not found" }
    }
    const draft = record.draft
    if (
      draft.status === "SUBMITTED" &&
      draft.githubPrUrl &&
      draft.githubPrNum
    ) {
      return {
        success: true,
        prUrl: draft.githubPrUrl,
        prNumber: draft.githubPrNum,
      }
    }
    if (!canSubmitDraft(draft)) {
      return { success: false, error: "This draft can no longer be submitted" }
    }
    requireDraftVersion(record.etag, opts.etag)
    const operations = draft.operations
    if (!operations.length) {
      return { success: false, error: "Cannot submit an empty draft" }
    }
    if (
      operations.some(
        (operation) =>
          operation.kind !== "delete" &&
          !(operation.after?.["Full Form (English)"] ?? "").trim()
      )
    ) {
      return {
        success: false,
        error: "Every new or edited term needs an English full form.",
      }
    }

    const token = resolveGithubToken()

    if (!token) {
      return {
        success: false,
        error:
          "GitHub glossary write token is not configured on the server (missing GITHUB_TOKEN).",
      }
    }

    const identity = await getAuthorIdentity(session)
    const githubLogin = session.user.githubLogin
    const authorEmail =
      opts.useRealEmail && session.user.email
        ? session.user.email
        : identity.email
    const authorName = identity.name

    let snapshot = await getFileSnapshot(
      GLOSSARY_CSV_PATH,
      GLOSSARY_MAIN_BRANCH,
      token,
      GLOSSARY_REPO
    )

    if (!snapshot) {
      snapshot = await getFileSnapshot(
        GLOSSARY_CSV_PATH,
        GLOSSARY_MAIN_BRANCH,
        token,
        GLOSSARY_FORK_REPO
      )
    }

    if (!snapshot) {
      throw new Error(
        `Failed to fetch "${GLOSSARY_CSV_PATH}" from GitHub (${GLOSSARY_REPO.owner}/${GLOSSARY_REPO.name}).`
      )
    }

    const parsed = parseGlossaryCsv(snapshot.content)
    let rows = parsed.rows

    for (const op of operations) {
      const slugMap = new Map<string, number>()
      for (let i = 0; i < rows.length; i++) {
        const slug = generateSlug(rows[i]["Full Form (English)"])
        slugMap.set(slug, i)
      }

      if (op.kind === "edit") {
        const idx = slugMap.get(op.slug)
        if (idx !== undefined && op.after) {
          rows[idx] = op.after
        }
      } else if (op.kind === "add" && op.after) {
        rows.push(op.after)
      } else if (op.kind === "delete") {
        const idx = slugMap.get(op.slug)
        if (idx !== undefined) {
          rows.splice(idx, 1)
        }
      }
    }

    const serialized = serializeGlossaryCsv(rows, {
      headerOrder: parsed.headerOrder,
      hadBom: parsed.hadBom,
      lineEnding: parsed.lineEnding,
    })

    const editCount = operations.filter((op) => op.kind === "edit").length
    const addCount = operations.filter((op) => op.kind === "add").length
    const deleteCount = operations.filter((op) => op.kind === "delete").length

    const title =
      draft.title ||
      `Update glossary: ${editCount} edited, ${addCount} added, ${deleteCount} deleted`

    let body = `This PR updates glossary terms via [GTMC](https://techmc.wiki).\n\n`
    body += `Changes: ${editCount} edited, ${addCount} added, ${deleteCount} deleted.\n`
    if (githubLogin) {
      body += `Requested by @${githubLogin}.\n`
    }
    body += `Authored by ${authorName}.\n\n`
    body += `---\n`
    body += `This PR was created automatically from the GTMC glossary editor. Further edits cannot be pushed to this PR via the website. Please discuss changes in the PR comments or submit a new draft.`

    const locked = await lockSubmission(draft, record.etag)
    const branchName = locked.draft.branchName!

    let result: GlossaryPrResult
    try {
      result = await openGlossaryPullRequest({
        csvContent: serialized,
        title,
        body,
        branchName,
        recoverOnly: locked.recoverOnly,
        authorName,
        authorEmail,
        token,
      })
    } catch (error) {
      if (!(error instanceof SubmissionInProgressError)) {
        const recovered = await reconcileSubmission(
          session.user.id,
          id,
          token
        ).catch((reconcileError) => {
          console.error(
            "Failed to reconcile glossary submission:",
            reconcileError
          )
          return null
        })
        if (recovered !== null) {
          return {
            success: true,
            prUrl: recovered.prUrl,
            prNumber: recovered.prNumber,
          }
        }
      }
      throw error
    }

    const now = new Date().toISOString()
    try {
      await writeDraft(
        {
          ...draft,
          status: assertDraftStatus("PENDING", {
            type: "SUBMISSION_SUCCEEDED",
          }),
          branchName: result.branchName,
          githubPrUrl: result.prUrl,
          githubPrNum: result.prNumber,
          submittedAt: now,
          updatedAt: now,
        },
        locked.etag
      )
    } catch (error) {
      const recovered = await reconcileSubmission(
        session.user.id,
        id,
        token,
        result
      ).catch((reconcileError) => {
        console.error(
          "Failed to persist submitted glossary draft:",
          reconcileError
        )
        return null
      })
      if (recovered === null) {
        throw error
      }
    }

    try {
      revalidatePath("/draft")
      revalidatePath("/glossary")
    } catch {
      // The PR and submission status are durable; cache refresh is best-effort.
    }

    return { success: true, prUrl: result.prUrl, prNumber: result.prNumber }
  } catch (outerError) {
    const message =
      outerError instanceof Error ? outerError.message : "Submission failed"
    return { success: false, error: message }
  }
}
