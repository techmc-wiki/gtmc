"use server"

import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { revalidatePaths } from "@/lib/revalidate-paths"
import {
  forcePushResolvedToPRBranch,
  resolveDraftSyncConflict,
} from "@/lib/articles/conflict"
import { getMainBranchHeadSha } from "@/lib/articles/branch"
import { resumeRebase } from "@/lib/articles/rebase"
import {
  decodeStoredDraftFiles,
  deserializeDraftFilesPayload,
  getActiveDraftFile,
  normalizeDraftFileCollection,
  serializeDraftFilesForStorage,
} from "@/lib/drafts/files"
import { prisma } from "@/lib/prisma"
import type { RebaseState } from "@/lib/review/rebase-types"
import type { ConflictMode } from "@/lib/review/review-types"
import { reviewLog, reviewError, summarizeSha } from "@/lib/logging"
import {
  requireReviewAdminContext,
  getReviewRevalidatePaths,
} from "@/lib/review/admin-context"
import {
  applyRebasedFilesToDraft,
  formatErrorMessage,
  hasSimpleConflictMarkers,
  persistRebasedBranchFiles,
} from "@/lib/review/action-utils"
import {
  buildDraftSnapshot,
  focusDraftFileByPath,
  getFirstConflictedFilePath,
  recordResolvedRerereEntries,
} from "@/lib/review/conflict-utils"

export async function resolveConflictAction(
  prNumber: number,
  formData: FormData
) {
  reviewLog("resolveConflictAction", {
    prNumber,
    status: "start",
    contentProvided: Boolean(formData.get("content")),
    draftFilesProvided: Boolean(formData.get("draftFiles")),
  })

  try {
    const { session, token, authorName, authorEmail } =
      await requireReviewAdminContext()

    const resolveConflictSchema = z.object({
      content: z.string().nullable().default(null),
      draftFiles: z.string().nullable().default(null),
    })

    const validated = resolveConflictSchema.safeParse(
      Object.fromEntries(formData)
    )

    if (!validated.success) {
      return { errors: validated.error.flatten().fieldErrors }
    }

    const content = validated.data.content
    const draftFilesPayload = validated.data.draftFiles

    const linkedDraft = await prisma.revision.findFirst({
      where: { githubPrNum: prNumber },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!linkedDraft) {
      throw new Error("Linked draft not found")
    }

    if (!linkedDraft.filePath || !linkedDraft.prBranchName) {
      throw new Error("The linked draft is missing PR metadata")
    }

    const submitterName = linkedDraft.author?.name || authorName
    const submitterEmail = linkedDraft.author?.email || authorEmail

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
            folders: storedDraftFiles.folders || [],
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
      return {
        errors: { content: ["Resolved content is required"] },
      }
    }

    const conflictMode = (linkedDraft as { conflictMode?: ConflictMode | null })
      .conflictMode

    reviewLog("resolveConflictAction", {
      prNumber,
      revisionId: linkedDraft.id,
      status: "loaded",
      conflictMode,
      fileCount: storedDraftFiles.files.length,
      actorUserId: session.user.id,
    })

    if (conflictMode === "SIMPLE") {
      reviewLog("resolveConflictAction", {
        prNumber,
        status: "branch",
        branch: "SIMPLE",
        fileCount: resolvedDraftFiles.files.length,
      })
      const storedFileMap = new Map(
        storedDraftFiles.files.map((file) => [file.id, file])
      )
      const nextDraftFiles = normalizeDraftFileCollection({
        activeFileId: resolvedDraftFiles.activeFileId,
        folders: resolvedDraftFiles.folders || [],
        files: resolvedDraftFiles.files.map((file) => {
          const previousFile = storedFileMap.get(file.id)
          const stillHasConflict = hasSimpleConflictMarkers(file.content)

          return {
            ...file,
            content: stillHasConflict
              ? (previousFile?.content ?? file.content)
              : file.content,
            ...(stillHasConflict ? { conflictContent: file.content } : {}),
          }
        }),
      })
      const focusedNextDraftFiles = focusDraftFileByPath(
        nextDraftFiles,
        getFirstConflictedFilePath(nextDraftFiles.files)
      )
      const nextStorage = serializeDraftFilesForStorage(focusedNextDraftFiles)
      const nextStatus = focusedNextDraftFiles.files.some(
        (file) =>
          file.conflictContent !== undefined && file.conflictContent !== null
      )
        ? "SYNC_CONFLICT"
        : "IN_REVIEW"
      const focusFilePath = getFirstConflictedFilePath(
        focusedNextDraftFiles.files
      )

      await recordResolvedRerereEntries({
        token,
        storedFiles: storedDraftFiles.files,
        resolvedFiles: focusedNextDraftFiles.files,
        baseRef: linkedDraft.baseMainSha,
      })

      reviewLog("resolveConflictAction", {
        prNumber,
        status: "db-write-before",
        fields: ["conflictContent", "content", "filePath", "status"],
        nextStatus,
      })
      await prisma.revision.update({
        where: { id: linkedDraft.id },
        data: {
          conflictContent: nextStorage.conflictContent,
          content: nextStorage.content,
          filePath: nextStorage.filePath,
          status: nextStatus,
        },
      })
      reviewLog("resolveConflictAction", {
        prNumber,
        status: "db-write-after",
        fields: ["conflictContent", "content", "filePath", "status"],
        nextStatus,
      })

      const latestMainSha = await getMainBranchHeadSha(token)
      reviewLog("resolveConflictAction", {
        prNumber,
        status: "force-push-start",
        prBranchName: linkedDraft.prBranchName,
        fileCount: focusedNextDraftFiles.files.length,
        latestMainSha: summarizeSha(latestMainSha),
      })
      await forcePushResolvedToPRBranch({
        resolvedFiles: focusedNextDraftFiles.files.map((file) => ({
          filePath: file.filePath,
          content: file.content,
        })),
        prBranchName: linkedDraft.prBranchName,
        latestMainSha,
        commitMessage: "chore(review): apply conflict resolution",
        authorName: submitterName,
        authorEmail: submitterEmail,
        token,
      })
      reviewLog("resolveConflictAction", {
        prNumber,
        status: "force-push-complete",
        prBranchName: linkedDraft.prBranchName,
      })

      revalidatePaths(getReviewRevalidatePaths(linkedDraft.id, prNumber))
      reviewLog("resolveConflictAction", {
        prNumber,
        status: "complete",
        conflictMode,
        resultStatus: nextStatus,
      })
      return {
        success: true,
        status: nextStatus,
        hasConflicts: nextStatus === "SYNC_CONFLICT",
        focusFilePath,
        draftSnapshot: buildDraftSnapshot(focusedNextDraftFiles),
      }
    }

    const rebaseState = linkedDraft.rebaseState as RebaseState | null

    if (rebaseState?.status === "CONFLICT") {
      reviewLog("resolveConflictAction", {
        prNumber,
        status: "branch",
        branch: "FINE_GRAINED",
        currentCommitIndex: rebaseState.currentCommitIndex,
      })
      const resolvedFile = getActiveDraftFile(resolvedDraftFiles)
      const storedFile = getActiveDraftFile(storedDraftFiles)
      const rebaseConflictBaseRef =
        rebaseState.currentCommitIndex > 0
          ? rebaseState.commitInfos[rebaseState.currentCommitIndex - 1]?.sha
          : linkedDraft.baseMainSha

      await recordResolvedRerereEntries({
        token,
        storedFiles: storedDraftFiles.files,
        resolvedFiles: resolvedDraftFiles.files,
        baseRef: rebaseConflictBaseRef,
      })

      const result = await resumeRebase({
        draftId: linkedDraft.id,
        resolvedContent: resolvedFile.content,
        resolvedFiles: resolvedDraftFiles.files.map((file) => ({
          filePath: file.filePath,
          content: file.content,
        })),
        token,
      })
      reviewLog("resolveConflictAction", {
        prNumber,
        status: "resume-rebase-result",
        resultStatus: result.status,
      })

      if (result.status === "SUCCESS") {
        const rebasedDraftFiles = applyRebasedFilesToDraft(
          storedDraftFiles,
          result.files,
          { filePath: storedFile.filePath, content: result.finalContent }
        )
        reviewLog("resolveConflictAction", {
          prNumber,
          status: "force-push-start",
          prBranchName: linkedDraft.prBranchName,
          fileCount: rebasedDraftFiles.files.length,
        })
        await persistRebasedBranchFiles({
          authorEmail: submitterEmail,
          authorName: submitterName,
          branchName: linkedDraft.prBranchName,
          files: rebasedDraftFiles.files.map((file) => ({
            filePath: file.filePath,
            content: file.content,
          })),
          message: `docs: apply rebase for ${linkedDraft.title}`,
          token,
        })
        reviewLog("resolveConflictAction", {
          prNumber,
          status: "force-push-complete",
          prBranchName: linkedDraft.prBranchName,
        })
        const rebasedDraftStorage =
          serializeDraftFilesForStorage(rebasedDraftFiles)
        reviewLog("resolveConflictAction", {
          prNumber,
          status: "db-write-before",
          fields: [
            "status",
            "conflictContent",
            "content",
            "filePath",
            "rebaseState",
          ],
          nextStatus: "IN_REVIEW",
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
        reviewLog("resolveConflictAction", {
          prNumber,
          status: "db-write-after",
          fields: [
            "status",
            "conflictContent",
            "content",
            "filePath",
            "rebaseState",
          ],
          nextStatus: "IN_REVIEW",
        })
      } else if (result.status === "CONFLICT") {
        const focusFilePath = result.conflictFilePath ?? storedFile.filePath
        const conflictDraftFiles = focusDraftFileByPath(
          applyRebasedFilesToDraft(storedDraftFiles, result.files, undefined, {
            filePath: focusFilePath,
            content: result.conflictContent,
          }),
          focusFilePath
        )
        const conflictDraftStorage =
          serializeDraftFilesForStorage(conflictDraftFiles)
        reviewLog("resolveConflictAction", {
          prNumber,
          status: "branch-decision",
          branch: "CONFLICT",
          conflictFilePath: focusFilePath,
        })
        reviewLog("resolveConflictAction", {
          prNumber,
          status: "db-write-before",
          fields: ["status", "conflictContent", "content", "filePath"],
          nextStatus: "SYNC_CONFLICT",
        })
        await prisma.revision.update({
          where: { id: linkedDraft.id },
          data: {
            status: "SYNC_CONFLICT",
            conflictContent: conflictDraftStorage.conflictContent,
            content: conflictDraftStorage.content,
            filePath: conflictDraftStorage.filePath,
          },
        })
        reviewLog("resolveConflictAction", {
          prNumber,
          status: "db-write-after",
          fields: ["status", "conflictContent", "content", "filePath"],
          nextStatus: "SYNC_CONFLICT",
        })
      } else if (result.status === "FILE_DELETED_CONFLICT") {
        const deletedConflictDraftStorage = serializeDraftFilesForStorage(
          applyRebasedFilesToDraft(storedDraftFiles, result.files)
        )
        reviewLog("resolveConflictAction", {
          prNumber,
          status: "branch-decision",
          branch: "FILE_DELETED_CONFLICT",
        })
        reviewLog("resolveConflictAction", {
          prNumber,
          status: "db-write-before",
          fields: ["status", "content", "filePath", "conflictContent"],
          nextStatus: "SYNC_CONFLICT",
        })
        await prisma.revision.update({
          where: { id: linkedDraft.id },
          data: {
            status: "SYNC_CONFLICT",
            content: deletedConflictDraftStorage.content,
            filePath: deletedConflictDraftStorage.filePath,
            conflictContent: deletedConflictDraftStorage.conflictContent,
          },
        })
        reviewLog("resolveConflictAction", {
          prNumber,
          status: "db-write-after",
          fields: ["status", "content", "filePath", "conflictContent"],
          nextStatus: "SYNC_CONFLICT",
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
      reviewLog("resolveConflictAction", {
        prNumber,
        status: "complete",
        conflictMode,
        resultStatus: result.status,
      })
      return {
        success: true,
        status: result.status,
        hasConflicts:
          result.status === "CONFLICT" ||
          result.status === "FILE_DELETED_CONFLICT",
        focusFilePath:
          result.status === "CONFLICT"
            ? (result.conflictFilePath ?? storedFile.filePath)
            : null,
      }
    }

    const result = await resolveDraftSyncConflict({
      activeFileId: resolvedDraftFiles.activeFileId,
      authorEmail,
      authorName,
      branchName: linkedDraft.prBranchName,
      // oxlint-disable-next-line no-map-spread
      files: resolvedDraftFiles.files.map((file) => ({
        ...file,
        conflictContent: undefined,
      })),
      syncedMainSha: linkedDraft.syncedMainSha,
      title: linkedDraft.title,
      token,
    })

    const syncedDraftFiles = focusDraftFileByPath(
      {
        activeFileId: result.activeFileId,
        folders: storedDraftFiles.folders || [],
        files: result.files,
      },
      getFirstConflictedFilePath(result.files)
    )
    const syncedDraftStorage = serializeDraftFilesForStorage(syncedDraftFiles)
    const focusFilePath = getFirstConflictedFilePath(syncedDraftFiles.files)

    reviewLog("resolveConflictAction", {
      prNumber,
      status: "db-write-before",
      fields: [
        "conflictContent",
        "content",
        "filePath",
        "status",
        "syncedMainSha",
      ],
      nextStatus: result.status,
      syncedMainSha: summarizeSha(result.syncedMainSha),
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
    reviewLog("resolveConflictAction", {
      prNumber,
      status: "db-write-after",
      fields: [
        "conflictContent",
        "content",
        "filePath",
        "status",
        "syncedMainSha",
      ],
      nextStatus: result.status,
      syncedMainSha: summarizeSha(result.syncedMainSha),
    })

    revalidatePaths([
      "/draft",
      `/draft/${linkedDraft.id}`,
      "/review",
      `/review/${prNumber}`,
    ])

    reviewLog("resolveConflictAction", {
      prNumber,
      status: "complete",
      conflictMode,
      resultStatus: result.status,
    })
    return {
      success: true,
      status: result.status,
      hasConflicts: focusFilePath !== null,
      focusFilePath,
      draftSnapshot: buildDraftSnapshot(syncedDraftFiles),
    }
  } catch (error) {
    reviewError("resolveConflictAction", error, { prNumber, status: "error" })
    throw error
  }
}
