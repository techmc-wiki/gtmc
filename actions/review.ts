"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

import { revalidatePaths } from "@/lib/revalidation"
import {
  resolveDraftSyncConflict,
  upsertFileOnBranch,
} from "@/lib/article-submission"
import {
  abortRebase,
  rebaseArticleContent,
  resumeRebase,
} from "@/lib/article-rebase"
import { getTokenFromSession, requireAuth } from "@/lib/auth-helpers"
import { formatErrorMessage } from "@/lib/error-handling"
import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github-pr"
import { prisma } from "@/lib/prisma"
import type { RebaseState } from "@/types/rebase"

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

  const rebaseState = linkedDraft.rebaseState as RebaseState | null

  if (rebaseState?.status === "CONFLICT") {
    const result = await resumeRebase({
      draftId: linkedDraft.id,
      resolvedContent: content,
      token,
    })

    if (result.status === "SUCCESS") {
      await upsertFileOnBranch({
        authorEmail,
        authorName,
        branchName: linkedDraft.prBranchName,
        content: result.finalContent,
        filePath: linkedDraft.filePath,
        message: `docs: apply rebase for ${linkedDraft.title}`,
        token,
      })
      await prisma.revision.update({
        where: { id: linkedDraft.id },
        data: {
          status: "IN_REVIEW",
          conflictContent: null,
          content: result.finalContent,
          rebaseState: {
            ...rebaseState,
            status: "COMPLETED",
            resolvedContent: result.finalContent,
          } as unknown as Prisma.InputJsonValue,
        },
      })
    } else if (result.status === "CONFLICT") {
      await prisma.revision.update({
        where: { id: linkedDraft.id },
        data: {
          conflictContent: result.conflictContent,
        },
      })
    } else {
      throw new Error(formatErrorMessage("Resume rebase failed", result))
    }

    revalidatePaths([
      "/draft",
      `/draft/${linkedDraft.id}`,
      "/review",
      `/review/${prNumber}`,
    ])

    return { success: true, status: result.status }
  }

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

  revalidatePaths([
    "/draft",
    `/draft/${linkedDraft.id}`,
    "/review",
    `/review/${prNumber}`,
  ])

  return { success: true, status: result.status }
}

export async function submitWithRebaseAction(revisionId: string) {
  const session = await requireAuth()
  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const token = getTokenFromSession(session)
  const authorName = session.user.name || "GTMC Admin"
  const authorEmail = session.user.email || "admin@gtmc.dev"

  const revision = await prisma.revision.findUnique({
    where: { id: revisionId },
  })

  if (!revision) {
    throw new Error("Revision not found")
  }

  if (!revision.filePath || !revision.prBranchName) {
    throw new Error("The revision is missing PR metadata")
  }

  if (!revision.baseMainSha || !revision.syncedMainSha) {
    throw new Error("The revision is missing main SHA metadata")
  }

  const result = await rebaseArticleContent({
    draftId: revisionId,
    filePath: revision.filePath,
    baseMainSha: revision.baseMainSha,
    latestMainSha: revision.syncedMainSha,
    draftContent: revision.content,
    token,
  })

  if (result.status === "SUCCESS") {
    await upsertFileOnBranch({
      authorEmail,
      authorName,
      branchName: revision.prBranchName,
      content: result.finalContent,
      filePath: revision.filePath,
      message: `docs: apply fine-grained rebase for ${revision.title}`,
      token,
    })
    await prisma.revision.update({
      where: { id: revisionId },
      data: {
        status: "IN_REVIEW",
        conflictContent: null,
        content: result.finalContent,
      },
    })
  } else if (result.status === "CONFLICT") {
    await prisma.revision.update({
      where: { id: revisionId },
      data: {
        status: "SYNC_CONFLICT",
        conflictContent: result.conflictContent,
      },
    })
  } else if (result.status === "FILE_DELETED_CONFLICT") {
    await prisma.revision.update({
      where: { id: revisionId },
      data: {
        status: "SYNC_CONFLICT",
        conflictContent: null,
      },
    })
  }

  revalidatePaths(
    [
      "/draft",
      `/draft/${revisionId}`,
      "/review",
      revision.githubPrNum ? `/review/${revision.githubPrNum}` : "",
    ].filter(Boolean)
  )

  return { success: true, status: result.status }
}

export async function abortRebaseAction(revisionId: string) {
  const session = await requireAuth()
  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const token = getTokenFromSession(session)

  try {
    const revision = await prisma.revision.findUnique({
      where: { id: revisionId },
    })

    if (!revision) {
      throw new Error("Revision not found")
    }

    await abortRebase({
      draftId: revisionId,
      token,
    })

    revalidatePaths(
      [
        "/draft",
        `/draft/${revisionId}`,
        "/review",
        revision.githubPrNum ? `/review/${revision.githubPrNum}` : "",
      ].filter(Boolean)
    )

    return { success: true }
  } catch (error) {
    throw new Error(formatErrorMessage("Abort rebase failed", error))
  }
}

export async function keepFileAction(revisionId: string) {
  const session = await requireAuth()
  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  const token = getTokenFromSession(session)
  const authorName = session.user.name || "GTMC Admin"
  const authorEmail = session.user.email || "admin@gtmc.dev"

  const revision = await prisma.revision.findUnique({
    where: { id: revisionId },
  })

  if (!revision) {
    throw new Error("Revision not found")
  }

  if (!revision.filePath || !revision.prBranchName) {
    throw new Error("The revision is missing PR metadata")
  }

  await upsertFileOnBranch({
    authorEmail,
    authorName,
    branchName: revision.prBranchName,
    content: revision.content,
    filePath: revision.filePath,
    message: `docs: keep file despite deletion in main for ${revision.title}`,
    token,
  })

  await prisma.revision.update({
    where: { id: revisionId },
    data: {
      status: "IN_REVIEW",
      conflictContent: null,
      rebaseState: Prisma.DbNull,
    },
  })

  revalidatePaths(
    [
      "/draft",
      `/draft/${revisionId}`,
      "/review",
      revision.githubPrNum ? `/review/${revision.githubPrNum}` : "",
    ].filter(Boolean)
  )

  return { success: true }
}
