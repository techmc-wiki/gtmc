"use server"

import { revalidatePaths } from "@/lib/revalidate-paths"
import {
  forcePushResolvedToPRBranch,
  resolveSimpleConflicts,
} from "@/lib/articles/conflict"
import {
  getMainBranchHeadSha,
  getArticleFileContent,
} from "@/lib/articles/branch"
import {
  decodeStoredDraftFiles,
  getActiveDraftFile,
  normalizeDraftFileCollection,
  serializeDraftFilesForStorage,
} from "@/lib/drafts/files"
import { prisma } from "@/lib/prisma"
import type { ConflictMode } from "@/lib/review/review-types"
import { reviewLog, reviewError, summarizeSha } from "@/lib/logging"
import {
  requireReviewAdminContext,
  getReviewRevalidatePaths,
} from "@/lib/review/admin-context"
import {
  applyRebasedFilesToDraft,
  persistRebasedBranchFiles,
} from "@/lib/review/action-utils"
import {
  buildDraftSnapshot,
  focusDraftFileByPath,
} from "@/lib/review/conflict-utils"

export async function selectModeAction(revisionId: string, mode: ConflictMode) {
  reviewLog("selectModeAction", { revisionId, status: "start", mode })

  try {
    const { token, authorName, authorEmail } = await requireReviewAdminContext()

    const revision = await prisma.revision.findUnique({
      where: { id: revisionId },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!revision) {
      throw new Error("Revision not found")
    }

    if (!revision.prBranchName) {
      throw new Error("The revision is missing PR metadata")
    }

    const submitterName = revision.author.name || authorName
    const submitterEmail = revision.author.email || authorEmail

    const storedDraftFiles = decodeStoredDraftFiles({
      content: revision.content,
      conflictContent: revision.conflictContent,
      filePath: revision.filePath,
    })
    const draftFile = getActiveDraftFile(storedDraftFiles)

    reviewLog("selectModeAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "loaded",
      mode,
      fileCount: storedDraftFiles.files.length,
    })

    if (mode === "FINE_GRAINED") {
      reviewLog("selectModeAction", {
        revisionId,
        prNumber: revision.githubPrNum,
        status: "branch",
        branch: "FINE_GRAINED",
      })
      if (!revision.baseMainSha || !revision.syncedMainSha) {
        throw new Error("The revision is missing main SHA metadata")
      }

      const { rebaseArticleContent, rebaseArticleContentMultiFile } =
        await import("@/lib/articles/rebase")
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

      reviewLog("selectModeAction", {
        revisionId,
        prNumber: revision.githubPrNum,
        status: "rebase-result",
        mode,
        resultStatus: result.status,
      })

      if (result.status === "SUCCESS") {
        const rebasedDraftFiles = applyRebasedFilesToDraft(
          storedDraftFiles,
          result.files,
          { filePath: draftFile.filePath, content: result.finalContent }
        )
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "force-push-start",
          prBranchName: revision.prBranchName,
          fileCount: rebasedDraftFiles.files.length,
        })
        await persistRebasedBranchFiles({
          authorEmail: submitterEmail,
          authorName: submitterName,
          branchName: revision.prBranchName,
          files: rebasedDraftFiles.files.map((file) => ({
            filePath: file.filePath,
            content: file.content,
          })),
          message: `docs: apply fine-grained rebase for ${revision.title}`,
          token,
        })
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "force-push-complete",
          prBranchName: revision.prBranchName,
        })
        const rebasedDraftStorage =
          serializeDraftFilesForStorage(rebasedDraftFiles)
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "db-write-before",
          fields: [
            "status",
            "conflictMode",
            "conflictContent",
            "content",
            "filePath",
          ],
          nextStatus: "IN_REVIEW",
        })
        await prisma.revision.update({
          where: { id: revisionId },
          data: {
            status: "IN_REVIEW",
            conflictMode: mode,
            conflictContent: rebasedDraftStorage.conflictContent,
            content: rebasedDraftStorage.content,
            filePath: rebasedDraftStorage.filePath,
          },
        })
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "db-write-after",
          fields: [
            "status",
            "conflictMode",
            "conflictContent",
            "content",
            "filePath",
          ],
          nextStatus: "IN_REVIEW",
        })
      } else if (result.status === "CONFLICT") {
        const conflictDraftStorage = serializeDraftFilesForStorage(
          applyRebasedFilesToDraft(storedDraftFiles, result.files, undefined, {
            filePath: result.conflictFilePath ?? draftFile.filePath,
            content: result.conflictContent,
          })
        )
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "branch-decision",
          branch: "CONFLICT",
        })
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "db-write-before",
          fields: ["status", "conflictContent", "content", "filePath"],
          nextStatus: "SYNC_CONFLICT",
        })
        await prisma.revision.update({
          where: { id: revisionId },
          data: {
            status: "SYNC_CONFLICT",
            conflictContent: conflictDraftStorage.conflictContent,
            content: conflictDraftStorage.content,
            filePath: conflictDraftStorage.filePath,
          },
        })
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "db-write-after",
          fields: ["status", "conflictContent", "content", "filePath"],
          nextStatus: "SYNC_CONFLICT",
        })
      } else if (result.status === "FILE_DELETED_CONFLICT") {
        const deletedConflictDraftStorage = serializeDraftFilesForStorage(
          applyRebasedFilesToDraft(storedDraftFiles, result.files)
        )
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "branch-decision",
          branch: "FILE_DELETED_CONFLICT",
        })
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "db-write-before",
          fields: ["status", "content", "filePath", "conflictContent"],
          nextStatus: "SYNC_CONFLICT",
        })
        await prisma.revision.update({
          where: { id: revisionId },
          data: {
            status: "SYNC_CONFLICT",
            content: deletedConflictDraftStorage.content,
            filePath: deletedConflictDraftStorage.filePath,
            conflictContent: deletedConflictDraftStorage.conflictContent,
          },
        })
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "db-write-after",
          fields: ["status", "content", "filePath", "conflictContent"],
          nextStatus: "SYNC_CONFLICT",
        })
      } else if (result.status === "NO_CHANGE") {
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "branch-decision",
          branch: "NO_CHANGE",
        })
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "db-write-before",
          fields: ["status", "conflictMode", "conflictContent"],
          nextStatus: "IN_REVIEW",
        })
        await prisma.revision.update({
          where: { id: revisionId },
          data: {
            status: "IN_REVIEW",
            conflictMode: mode,
            conflictContent: null,
          },
        })
        reviewLog("selectModeAction", {
          revisionId,
          prNumber: revision.githubPrNum,
          status: "db-write-after",
          fields: ["status", "conflictMode", "conflictContent"],
          nextStatus: "IN_REVIEW",
        })
      }

      revalidatePaths(
        getReviewRevalidatePaths(revisionId, revision.githubPrNum)
      )
      reviewLog("selectModeAction", {
        revisionId,
        prNumber: revision.githubPrNum,
        status: "complete",
        mode,
        resultStatus: result.status,
        conflictMode: mode,
      })
      return {
        success: true,
        status: result.status,
        conflictMode: mode,
        hasConflicts:
          result.status === "CONFLICT" ||
          result.status === "FILE_DELETED_CONFLICT",
        focusFilePath:
          result.status === "CONFLICT"
            ? (result.conflictFilePath ?? draftFile.filePath)
            : null,
      }
    }

    reviewLog("selectModeAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "branch",
      branch: "SIMPLE",
    })
    if (!revision.baseMainSha || !revision.syncedMainSha) {
      throw new Error("The revision is missing main SHA metadata")
    }

    const latestMainSha = await getMainBranchHeadSha(token)
    const fileInputs = await Promise.all(
      storedDraftFiles.files.map(async (file) => ({
        filePath: file.filePath,
        baseContent: await getArticleFileContent(
          file.filePath,
          revision.baseMainSha as string,
          token
        ),
        draftContent: file.content,
        latestMainContent: await getArticleFileContent(
          file.filePath,
          latestMainSha,
          token
        ),
      }))
    )
    reviewLog("selectModeAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "simple-sha-debug",
      baseMainSha: summarizeSha(revision.baseMainSha as string),
      syncedMainSha: summarizeSha(revision.syncedMainSha as string),
      latestMainSha: summarizeSha(latestMainSha),
      shaMatch: revision.baseMainSha === latestMainSha,
    })
    const result = await resolveSimpleConflicts({
      files: fileInputs,
      prBranchName: revision.prBranchName,
      latestMainSha,
      token,
    })
    reviewLog("selectModeAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "simple-merge-result",
      hasConflicts: result.hasConflicts,
      fileResults: result.fileResults.map((file) => ({
        filePath: file.filePath,
        status: file.status,
        contentLength: file.content.length,
      })),
    })

    reviewLog("selectModeAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "force-push-start",
      prBranchName: revision.prBranchName,
      fileCount: storedDraftFiles.files.length,
      latestMainSha: summarizeSha(latestMainSha),
    })
    await forcePushResolvedToPRBranch({
      resolvedFiles: storedDraftFiles.files.map((file) => ({
        filePath: file.filePath,
        content: file.content,
      })),
      prBranchName: revision.prBranchName,
      latestMainSha,
      commitMessage: "chore(review): sync draft to PR branch for review",
      authorName: submitterName,
      authorEmail: submitterEmail,
      token,
    })
    reviewLog("selectModeAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "force-push-complete",
      prBranchName: revision.prBranchName,
    })

    const firstConflictFilePath =
      result.fileResults.find((file) => file.status === "conflict")?.filePath ??
      null
    const mergedDraftFiles = focusDraftFileByPath(
      normalizeDraftFileCollection({
        activeFileId: storedDraftFiles.activeFileId,
        folders: storedDraftFiles.folders || [],
        // oxlint-disable-next-line no-map-spread
        files: storedDraftFiles.files.map((file) => {
          const mergedFile = result.fileResults.find(
            (candidate) => candidate.filePath === file.filePath
          )

          if (!mergedFile) {
            return file
          }

          return {
            ...file,
            content:
              mergedFile.status === "clean" ? mergedFile.content : file.content,
            ...(mergedFile.status === "conflict"
              ? { conflictContent: mergedFile.content }
              : { conflictContent: undefined }),
          }
        }),
      }),
      firstConflictFilePath
    )
    const mergedDraftStorage = serializeDraftFilesForStorage(mergedDraftFiles)

    reviewLog("selectModeAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "db-write-before",
      fields: [
        "conflictContent",
        "content",
        "filePath",
        "status",
        "syncedMainSha",
        "conflictMode",
      ],
      nextStatus: result.hasConflicts ? "SYNC_CONFLICT" : "IN_REVIEW",
      syncedMainSha: summarizeSha(latestMainSha),
    })
    await prisma.revision.update({
      where: { id: revisionId },
      data: {
        conflictContent: mergedDraftStorage.conflictContent,
        content: mergedDraftStorage.content,
        filePath: mergedDraftStorage.filePath,
        status: result.hasConflicts ? "SYNC_CONFLICT" : "IN_REVIEW",
        syncedMainSha: latestMainSha,
        conflictMode: mode,
      },
    })
    reviewLog("selectModeAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "db-write-after",
      fields: [
        "conflictContent",
        "content",
        "filePath",
        "status",
        "syncedMainSha",
        "conflictMode",
      ],
      nextStatus: result.hasConflicts ? "SYNC_CONFLICT" : "IN_REVIEW",
      syncedMainSha: summarizeSha(latestMainSha),
    })

    revalidatePaths(getReviewRevalidatePaths(revisionId, revision.githubPrNum))

    reviewLog("selectModeAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "complete",
      mode,
      resultStatus: result.hasConflicts ? "CONFLICT" : "CLEAN",
      conflictMode: mode,
    })
    return {
      success: true,
      status: result.hasConflicts ? "CONFLICT" : "CLEAN",
      conflictMode: mode,
      hasConflicts: result.hasConflicts,
      focusFilePath: firstConflictFilePath,
      draftSnapshot: buildDraftSnapshot(mergedDraftFiles),
    }
  } catch (error) {
    reviewError("selectModeAction", error, {
      revisionId,
      mode,
      status: "error",
    })
    throw error
  }
}
