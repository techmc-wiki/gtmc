"use server"

import { revalidatePath } from "next/cache"

import { getAuthorIdentity, requireAuth } from "@/lib/auth/context"
import { readDraft, requireDraftVersion, writeDraft } from "@/lib/drafts/store"
import { lockSubmission } from "@/lib/drafts/submission"
import { parseGlossaryCsv, serializeGlossaryCsv } from "@/lib/glossary/csv"
import { openGlossaryPullRequest } from "@/lib/glossary/pr"
import { getFileSnapshot } from "@/lib/github/branch"
import { generateSlug } from "@/lib/glossary/slug"
import { GLOSSARY_FORK_REPO, GLOSSARY_REPO } from "@/lib/github/repos"
import { resolveGithubToken } from "@/lib/github/tokens"

const GLOSSARY_MAIN_BRANCH = "main"
const GLOSSARY_CSV_PATH = "TechMC Glossary.csv"

export type SubmitGlossaryResult =
  | { success: true; prUrl: string; prNumber: number }
  | { success: false; error: string }

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
    if (draft.status === "DRAFT") requireDraftVersion(record.etag, opts.etag)
    const operations = draft.operations
    if (!operations.length) {
      return { success: false, error: "Cannot submit an empty draft" }
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

    const result = await openGlossaryPullRequest({
      csvContent: serialized,
      title,
      body,
      branchName,
      recoverOnly: locked.recoverOnly,
      authorName,
      authorEmail,
      token,
    })

    const now = new Date().toISOString()
    await writeDraft(
      {
        ...draft,
        status: "SUBMITTED",
        branchName: result.branchName,
        githubPrUrl: result.prUrl,
        githubPrNum: result.prNumber,
        submittedAt: now,
        updatedAt: now,
      },
      locked.etag
    )

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
