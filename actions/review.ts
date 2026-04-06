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
import { requireAuth } from "@/lib/auth-helpers"
import { requireRecentAuth } from "@/lib/admin-reauth"
import { getGithubPatForUser, requireAdmin } from "@/lib/auth-context"
import {
  decodeStoredDraftFiles,
  deserializeDraftFilesPayload,
  getActiveDraftFile,
  normalizeDraftFileCollection,
  serializeDraftFilesForStorage,
} from "@/lib/draft-files"
import { formatErrorMessage } from "@/lib/error-handling"
import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import { reconcileDraftAssetsForPRCompletion } from "@/lib/draft-asset-reconciler"
import { prisma } from "@/lib/prisma"
import type { RebaseState } from "@/types/rebase"

const owner = ARTICLES_REPO_OWNER
const repo = ARTICLES_REPO_NAME

export async function mergePRAction(prNumber: number) {
  const session = await requireAuth()
  await requireAdmin(session.user.id)
  requireRecentAuth(session)

  const token = await getGithubPatForUser(session.user.id)
  const octokit = getOctokit(token)

  try {
    await octokit.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      merge_method: "squash", //TODO: Add a UI to allow selecting between rebase and squash.
    })
    try {
      await reconcileDraftAssetsForPRCompletion({
        prNumber,
        outcome: "PR-merged",
      })
    } catch (reconcileError) {
      console.error("Failed to reconcile draft assets after PR merge", {
        prNumber,
        reconcileError,
      })
    }
    revalidatePath("/draft")
    revalidatePath("/review")
    return { success: true }
  } catch (error) {
    throw new Error(formatErrorMessage("Merge failed", error))
  }
}

export async function closePRAction(prNumber: number) {
  const session = await requireAuth()
  await requireAdmin(session.user.id)
  requireRecentAuth(session)

  const token = await getGithubPatForUser(session.user.id)
  const octokit = getOctokit(token)

  try {
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      state: "closed",
    })
    try {
      await reconcileDraftAssetsForPRCompletion({
        prNumber,
        outcome: "PR-closed",
      })
    } catch (reconcileError) {
      console.error("Failed to reconcile draft assets after PR close", {
        prNumber,
        reconcileError,
      })
    }
    revalidatePath("/draft")
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
  await requireAdmin(session.user.id)
  requireRecentAuth(session)

  const content = formData.get("content") as string | null
  const draftFilesPayload = formData.get("draftFiles") as string | null

  const linkedDraft = await prisma.revision.findFirst({
    where: { githubPrNum: prNumber },
  })

  if (!linkedDraft) {
    throw new Error("Linked draft not found")
  }

  if (!linkedDraft.filePath || !linkedDraft.prBranchName) {
    throw new Error("The linked draft is missing PR metadata")
  }

  const storedDraftFiles = decodeStoredDraftFiles({
    content: linkedDraft.content,
    conflictContent: linkedDraft.conflictContent,
    filePath: linkedDraft.filePath,
  })
  const submittedDraftFiles = deserializeDraftFilesPayload(draftFilesPayload)
  const resolvedDraftFiles =
    submittedDraftFiles ||
    (content
      ? normalizeDraftFileCollection({
          activeFileId: storedDraftFiles.activeFileId,
          files: storedDraftFiles.files.map((file) => ({
            ...file,
            content:
              file.id === storedDraftFiles.activeFileId
                ? content
                : file.content,
          })),
        })
      : null)

  if (!resolvedDraftFiles) {
    throw new Error("Resolved content is required")
  }

  const token = await getGithubPatForUser(session.user.id)
  const authorName = session.user.name || "GTMC Admin"
  const authorEmail = session.user.email || "admin@gtmc.dev"

  const rebaseState = linkedDraft.rebaseState as RebaseState | null

  if (rebaseState?.status === "CONFLICT") {
    if (resolvedDraftFiles.files.length !== 1) {
      throw new Error("Fine-grained rebase only supports single-file drafts")
    }

    const resolvedFile = getActiveDraftFile(resolvedDraftFiles)
    const storedFile = getActiveDraftFile(storedDraftFiles)
    const result = await resumeRebase({
      draftId: linkedDraft.id,
      resolvedContent: resolvedFile.content,
      token,
    })

    if (result.status === "SUCCESS") {
      await upsertFileOnBranch({
        authorEmail,
        authorName,
        branchName: linkedDraft.prBranchName,
        content: result.finalContent,
        filePath: storedFile.filePath,
        message: `docs: apply rebase for ${linkedDraft.title}`,
        token,
      })
      const rebasedDraftStorage = serializeDraftFilesForStorage({
        activeFileId: storedDraftFiles.activeFileId,
        files: [
          {
            ...storedFile,
            content: result.finalContent,
            conflictContent: undefined,
          },
        ],
      })
      await prisma.revision.update({
        where: { id: linkedDraft.id },
        data: {
          status: "IN_REVIEW",
          conflictContent: rebasedDraftStorage.conflictContent,
          content: rebasedDraftStorage.content,
          filePath: rebasedDraftStorage.filePath,
          rebaseState: {
            ...rebaseState,
            status: "COMPLETED",
            resolvedContent: result.finalContent,
          } as unknown as Prisma.InputJsonValue,
        },
      })
    } else if (result.status === "CONFLICT") {
      const conflictDraftStorage = serializeDraftFilesForStorage({
        activeFileId: storedDraftFiles.activeFileId,
        files: [
          {
            ...storedFile,
            conflictContent: result.conflictContent,
          },
        ],
      })
      await prisma.revision.update({
        where: { id: linkedDraft.id },
        data: {
          conflictContent: conflictDraftStorage.conflictContent,
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
    activeFileId: resolvedDraftFiles.activeFileId,
    authorEmail,
    authorName,
    branchName: linkedDraft.prBranchName,
    files: resolvedDraftFiles.files.map((file) => ({
      ...file,
      conflictContent: undefined,
    })),
    syncedMainSha: linkedDraft.syncedMainSha,
    title: linkedDraft.title,
    token,
  })

  const syncedDraftStorage = serializeDraftFilesForStorage({
    activeFileId: result.activeFileId,
    files: result.files,
  })

  await prisma.revision.update({
    where: { id: linkedDraft.id },
    data: {
      conflictContent: syncedDraftStorage.conflictContent,
      content: syncedDraftStorage.content,
      filePath: syncedDraftStorage.filePath,
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
  await requireAdmin(session.user.id)
  requireRecentAuth(session)

  const token = await getGithubPatForUser(session.user.id)
  const authorName = session.user.name || "GTMC Admin"
  const authorEmail = session.user.email || "admin@gtmc.dev"

  const revision = await prisma.revision.findUnique({
    where: { id: revisionId },
  })

  if (!revision) {
    throw new Error("Revision not found")
  }

  const storedDraftFiles = decodeStoredDraftFiles({
    content: revision.content,
    conflictContent: revision.conflictContent,
    filePath: revision.filePath,
  })

  if (storedDraftFiles.files.length !== 1) {
    throw new Error(
      "Fine-grained rebase is only available for single-file drafts"
    )
  }

  const draftFile = getActiveDraftFile(storedDraftFiles)

  if (!draftFile.filePath || !revision.prBranchName) {
    throw new Error("The revision is missing PR metadata")
  }

  if (!revision.baseMainSha || !revision.syncedMainSha) {
    throw new Error("The revision is missing main SHA metadata")
  }

  const result = await rebaseArticleContent({
    draftId: revisionId,
    filePath: draftFile.filePath,
    baseMainSha: revision.baseMainSha,
    latestMainSha: revision.syncedMainSha,
    draftContent: draftFile.content,
    token,
  })

  if (result.status === "SUCCESS") {
    await upsertFileOnBranch({
      authorEmail,
      authorName,
      branchName: revision.prBranchName,
      content: result.finalContent,
      filePath: draftFile.filePath,
      message: `docs: apply fine-grained rebase for ${revision.title}`,
      token,
    })
    const rebasedDraftStorage = serializeDraftFilesForStorage({
      activeFileId: storedDraftFiles.activeFileId,
      files: [
        {
          ...draftFile,
          content: result.finalContent,
          conflictContent: undefined,
        },
      ],
    })
    await prisma.revision.update({
      where: { id: revisionId },
      data: {
        status: "IN_REVIEW",
        conflictContent: rebasedDraftStorage.conflictContent,
        content: rebasedDraftStorage.content,
        filePath: rebasedDraftStorage.filePath,
      },
    })
  } else if (result.status === "CONFLICT") {
    const conflictDraftStorage = serializeDraftFilesForStorage({
      activeFileId: storedDraftFiles.activeFileId,
      files: [
        {
          ...draftFile,
          conflictContent: result.conflictContent,
        },
      ],
    })
    await prisma.revision.update({
      where: { id: revisionId },
      data: {
        status: "SYNC_CONFLICT",
        conflictContent: conflictDraftStorage.conflictContent,
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
  await requireAdmin(session.user.id)
  requireRecentAuth(session)

  const token = await getGithubPatForUser(session.user.id)

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
  await requireAdmin(session.user.id)
  requireRecentAuth(session)

  const token = await getGithubPatForUser(session.user.id)
  const authorName = session.user.name || "GTMC Admin"
  const authorEmail = session.user.email || "admin@gtmc.dev"

  const revision = await prisma.revision.findUnique({
    where: { id: revisionId },
  })

  if (!revision) {
    throw new Error("Revision not found")
  }

  const storedDraftFiles = decodeStoredDraftFiles({
    content: revision.content,
    conflictContent: revision.conflictContent,
    filePath: revision.filePath,
  })

  if (storedDraftFiles.files.length !== 1) {
    throw new Error("Keep file only supports single-file drafts")
  }

  const draftFile = getActiveDraftFile(storedDraftFiles)

  if (!draftFile.filePath || !revision.prBranchName) {
    throw new Error("The revision is missing PR metadata")
  }

  await upsertFileOnBranch({
    authorEmail,
    authorName,
    branchName: revision.prBranchName,
    content: draftFile.content,
    filePath: draftFile.filePath,
    message: `docs: keep file despite deletion in main for ${revision.title}`,
    token,
  })

  const keptDraftStorage = serializeDraftFilesForStorage({
    activeFileId: storedDraftFiles.activeFileId,
    files: [
      {
        ...draftFile,
        conflictContent: undefined,
      },
    ],
  })

  await prisma.revision.update({
    where: { id: revisionId },
    data: {
      status: "IN_REVIEW",
      conflictContent: keptDraftStorage.conflictContent,
      content: keptDraftStorage.content,
      filePath: keptDraftStorage.filePath,
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
