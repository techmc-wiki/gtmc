"use server"

import { revalidatePath } from "next/cache"

import { revalidatePaths } from "@/lib/revalidation"
import { resolveDraftSyncConflict } from "@/lib/article-submission"
import { getTokenFromSession, requireAuth } from "@/lib/auth-helpers"
import { formatErrorMessage } from "@/lib/error-handling"
import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github-pr"
import { prisma } from "@/lib/prisma"

const owner = ARTICLES_REPO_OWNER
const repo = ARTICLES_REPO_NAME

export async function mergePRAction(prNumber: number) {
  const session = await requireAuth()
  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const token = getTokenFromSession(session)
  const octokit = getOctokit(token)

  try {
    await octokit.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
    })
    revalidatePath("/review")
    return { success: true }
  } catch (error) {
    throw new Error(formatErrorMessage("Merge failed", error))
  }
}

export async function closePRAction(prNumber: number) {
  const session = await requireAuth()
  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const token = getTokenFromSession(session)
  const octokit = getOctokit(token)

  try {
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      state: "closed",
    })
    revalidatePath("/review")
    return { success: true }
  } catch (error) {
    throw new Error(formatErrorMessage("Close failed", error))
  }
}

export async function resolveConflictAction(
  prNumber: number,
  formData: FormData
) {
  const session = await requireAuth()
  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const content = formData.get("content") as string

  if (!content) {
    throw new Error("Resolved content is required")
  }

  const linkedDraft = await prisma.revision.findFirst({
    where: { githubPrNum: prNumber },
  })

  if (!linkedDraft) {
    throw new Error("Linked draft not found")
  }

  if (!linkedDraft.filePath || !linkedDraft.prBranchName) {
    throw new Error("The linked draft is missing PR metadata")
  }

  const token = getTokenFromSession(session)
  const authorName = session.user.name || "GTMC Admin"
  const authorEmail = session.user.email || "admin@gtmc.dev"

  const result = await resolveDraftSyncConflict({
    authorEmail,
    authorName,
    branchName: linkedDraft.prBranchName,
    content,
    filePath: linkedDraft.filePath,
    syncedMainSha: linkedDraft.syncedMainSha,
    title: linkedDraft.title,
    token,
  })

  await prisma.revision.update({
    where: { id: linkedDraft.id },
    data: {
      conflictContent: result.conflictContent,
      content:
        result.status === "IN_REVIEW" ? result.content : linkedDraft.content,
      filePath: result.filePath,
      status: result.status,
      syncedMainSha: result.syncedMainSha,
    },
  })

  revalidatePaths(["/draft", `/draft/${linkedDraft.id}`, "/review", `/review/${prNumber}`])

  return { success: true, status: result.status }
}
