"use server"

import { revalidatePaths } from "@/lib/revalidate-paths"
import {
  rebaseArticleContentMultiFile,
  rebaseArticleContent,
  abortRebase,
} from "@/lib/articles/rebase"
import { prisma } from "@/lib/prisma"
import {
  requireReviewAdminContext,
  getReviewRevalidatePaths,
} from "@/lib/review/admin-context"
import {
  applyRebasedFilesToDraft,
  formatErrorMessage,
  persistRebasedBranchFiles,
} from "@/lib/review/action-utils"
import {
  serializeDraftFilesForStorage,
  decodeStoredDraftFiles,
  getActiveDraftFile,
} from "@/lib/drafts/files"

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

  revalidatePaths(getReviewRevalidatePaths(revisionId, revision.githubPrNum))

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

    revalidatePaths(getReviewRevalidatePaths(revisionId, revision.githubPrNum))

    return { success: true }
  } catch (error) {
    throw new Error(formatErrorMessage("Abort rebase failed", error), {
      cause: error,
    })
  }
}
