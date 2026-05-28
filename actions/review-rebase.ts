"use server"

import { revalidatePaths } from "@/lib/revalidate-paths"
import {
  rebaseArticleContentMultiFile,
  rebaseArticleContent,
  abortRebase,
} from "@/lib/articles/rebase"
import { upsertFileOnBranch } from "@/lib/articles/branch"
import { prisma } from "@/lib/prisma"
import { requireReviewAdminContext } from "@/lib/review/admin-context"
import {
  serializeDraftFilesForStorage,
  normalizeDraftFileCollection,
  decodeStoredDraftFiles,
  getActiveDraftFile,
} from "@/lib/drafts/files"
import type { DraftFileCollection } from "@/lib/drafts/files"

function formatErrorMessage(message: string, error: unknown): string {
  if (error instanceof Error) {
    return `${message}: ${error.message}`
  }
  return message
}

function applyRebasedFilesToDraft(
  draftFiles: DraftFileCollection,
  rebasedFiles?: Array<{ filePath: string; content: string }>,
  singleFileFallback?: { filePath: string; content: string },
  conflict?: { filePath?: string; content?: string | null }
) {
  const rebasedFileMap = new Map(
    (rebasedFiles ?? []).map((file) => [file.filePath, file.content])
  )

  return normalizeDraftFileCollection({
    activeFileId: draftFiles.activeFileId,
    folders: draftFiles.folders || [],
    files: draftFiles.files.map((file) => ({
      ...file,
      content:
        rebasedFileMap.get(file.filePath) ??
        (singleFileFallback && file.filePath === singleFileFallback.filePath
          ? singleFileFallback.content
          : file.content),
      conflictContent:
        conflict?.content && file.filePath === conflict.filePath
          ? conflict.content
          : undefined,
    })),
  })
}

async function persistRebasedBranchFiles(input: {
  authorEmail: string
  authorName: string
  branchName: string
  files: Array<{ filePath: string; content: string }>
  message: string
  token?: string
}) {
  if (input.files.length <= 1) {
    const file = input.files[0]
    if (!file) {
      return
    }

    await upsertFileOnBranch({
      authorEmail: input.authorEmail,
      authorName: input.authorName,
      branchName: input.branchName,
      content: file.content,
      filePath: file.filePath,
      message: input.message,
      token: input.token,
    })
    return
  }

  if (!input.token) {
    throw new Error("GitHub token is required to update multiple files")
  }

  const { upsertFilesOnBranch } = await import("@/lib/articles/branch")
  await upsertFilesOnBranch(
    input.token,
    input.files.map((file) => ({
      path: file.filePath,
      content: file.content,
    })),
    input.branchName
  )
}

export async function submitWithRebaseAction(revisionId: string) {
  const { token, authorName, authorEmail } = await requireReviewAdminContext()

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

  const draftFile = getActiveDraftFile(storedDraftFiles)

  if (!draftFile.filePath || !revision.prBranchName) {
    throw new Error("The revision is missing PR metadata")
  }

  if (!revision.baseMainSha || !revision.syncedMainSha) {
    throw new Error("The revision is missing main SHA metadata")
  }

  const result =
    storedDraftFiles.files.length === 1
      ? await rebaseArticleContent({
          draftId: revisionId,
          filePath: draftFile.filePath,
          baseMainSha: revision.baseMainSha,
          latestMainSha: revision.syncedMainSha,
          draftContent: draftFile.content,
          token,
        })
      : await rebaseArticleContentMultiFile({
          draftId: revisionId,
          files: storedDraftFiles.files.map((file) => ({
            filePath: file.filePath,
            content: file.content,
          })),
          baseMainSha: revision.baseMainSha,
          latestMainSha: revision.syncedMainSha,
          token,
        })

  if (result.status === "SUCCESS") {
    const rebasedDraftFiles = applyRebasedFilesToDraft(
      storedDraftFiles,
      result.files,
      { filePath: draftFile.filePath, content: result.finalContent }
    )
    await persistRebasedBranchFiles({
      authorEmail,
      authorName,
      branchName: revision.prBranchName,
      files: rebasedDraftFiles.files.map((file) => ({
        filePath: file.filePath,
        content: file.content,
      })),
      message: `docs: apply fine-grained rebase for ${revision.title}`,
      token,
    })
    const rebasedDraftStorage = serializeDraftFilesForStorage(rebasedDraftFiles)
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
    const conflictDraftStorage = serializeDraftFilesForStorage(
      applyRebasedFilesToDraft(storedDraftFiles, result.files, undefined, {
        filePath: result.conflictFilePath ?? draftFile.filePath,
        content: result.conflictContent,
      })
    )
    await prisma.revision.update({
      where: { id: revisionId },
      data: {
        status: "SYNC_CONFLICT",
        conflictContent: conflictDraftStorage.conflictContent,
        content: conflictDraftStorage.content,
        filePath: conflictDraftStorage.filePath,
      },
    })
  } else if (result.status === "FILE_DELETED_CONFLICT") {
    const deletedConflictDraftStorage = serializeDraftFilesForStorage(
      applyRebasedFilesToDraft(storedDraftFiles, result.files)
    )
    await prisma.revision.update({
      where: { id: revisionId },
      data: {
        status: "SYNC_CONFLICT",
        content: deletedConflictDraftStorage.content,
        filePath: deletedConflictDraftStorage.filePath,
        conflictContent: deletedConflictDraftStorage.conflictContent,
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
  const { token } = await requireReviewAdminContext()

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
    throw new Error(formatErrorMessage("Abort rebase failed", error), {
      cause: error,
    })
  }
}
