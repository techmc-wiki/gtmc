"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

import { revalidatePaths } from "@/lib/revalidation"
import {
  forcePushResolvedToPRBranch,
  getArticleFileContent,
  getMainBranchHeadSha,
  resolveDraftSyncConflict,
  resolveSimpleConflicts,
  upsertFileOnBranch,
  upsertFilesOnBranch,
} from "@/lib/article-submission"
import {
  abortRebase,
  rebaseArticleContentMultiFile,
  rebaseArticleContent,
  resumeRebase,
} from "@/lib/article-rebase"
import { requireAuth } from "@/lib/auth-helpers"
import { getGithubPatForUser, requireAdmin } from "@/lib/auth-context"
import {
  decodeStoredDraftFiles,
  deserializeDraftFilesPayload,
  getActiveDraftFile,
  normalizeDraftFileCollection,
  serializeDraftFilesForStorage,
  type DraftFileCollection,
} from "@/lib/draft-files"
import { formatErrorMessage } from "@/lib/error-handling"
import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import { reconcileDraftAssetsForPRCompletion } from "@/lib/draft-asset-reconciler"
import { mergePR } from "@/lib/github/pr-manager"
import { prisma } from "@/lib/prisma"
import {
  parseConflictBlocks,
  SIMPLE_CONFLICT_BLOCK_RE,
  storeRerere,
} from "@/lib/rerere"
import type { RebaseState } from "@/types/rebase"
import type { ConflictMode, ReviewMergeMethod } from "@/types/review"

const owner = ARTICLES_REPO_OWNER
const repo = ARTICLES_REPO_NAME
const SIMPLE_CONFLICT_MARKER_RE = new RegExp(
  SIMPLE_CONFLICT_BLOCK_RE.source,
  "g"
)

function reviewLog(action: string, details: Record<string, unknown>) {
  console.log(`[review:${action}]`, details)
}

function reviewError(
  action: string,
  error: unknown,
  details: Record<string, unknown>
) {
  console.error(`[review:${action}]`, {
    ...details,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  })
}

function summarizeSha(sha?: string | null) {
  return sha ? sha.slice(0, 7) : null
}

function hasSimpleConflictMarkers(content: string) {
  SIMPLE_CONFLICT_MARKER_RE.lastIndex = 0
  return SIMPLE_CONFLICT_MARKER_RE.test(content)
}

type ConflictSection =
  | { type: "ok"; content: string }
  | { type: "conflict"; blockIndex: number }

function parseConflictSections(content: string): ConflictSection[] {
  const regex = new RegExp(SIMPLE_CONFLICT_BLOCK_RE.source, "g")
  const sections: ConflictSection[] = []
  let lastIndex = 0
  let blockIndex = 0
  let match = regex.exec(content)

  while (match !== null) {
    if (match.index > lastIndex) {
      sections.push({
        type: "ok",
        content: content.slice(lastIndex, match.index),
      })
    }

    sections.push({ type: "conflict", blockIndex })
    blockIndex += 1
    lastIndex = regex.lastIndex
    match = regex.exec(content)
  }

  if (lastIndex < content.length) {
    sections.push({ type: "ok", content: content.slice(lastIndex) })
  }

  return sections
}

function extractResolvedBlockResolutions(input: {
  originalConflictContent: string
  resolvedContent: string
  filePath: string
  baseContent: string
}) {
  const blocks = parseConflictBlocks(
    input.originalConflictContent,
    input.filePath,
    input.baseContent
  )
  const sections = parseConflictSections(input.originalConflictContent)
  const resolutions: Array<{
    block: (typeof blocks)[number]
    resolution: string
  }> = []
  let cursor = 0

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]

    if (section?.type === "ok") {
      if (!section.content) {
        continue
      }

      const index = input.resolvedContent.indexOf(section.content, cursor)
      if (index === -1) {
        return []
      }

      cursor = index + section.content.length
      continue
    }

    if (!section || section.type !== "conflict") {
      continue
    }

    const nextOk = sections
      .slice(i + 1)
      .find(
        (candidate): candidate is Extract<ConflictSection, { type: "ok" }> =>
          candidate.type === "ok" && candidate.content.length > 0
      )
    const endIndex = nextOk
      ? input.resolvedContent.indexOf(nextOk.content, cursor)
      : input.resolvedContent.length

    if (endIndex === -1) {
      return []
    }

    const block = blocks[section.blockIndex]
    if (!block) {
      continue
    }

    resolutions.push({
      block,
      resolution: input.resolvedContent.slice(cursor, endIndex),
    })
    cursor = endIndex
  }

  return resolutions
}

async function recordResolvedRerereEntries(input: {
  token?: string
  storedFiles: DraftFileCollection["files"]
  resolvedFiles: DraftFileCollection["files"]
  baseRef?: string | null
}) {
  if (!input.baseRef) {
    return
  }

  const resolvedById = new Map(
    input.resolvedFiles.map((file) => [file.id, file])
  )

  for (const storedFile of input.storedFiles) {
    const originalConflictContent = storedFile.conflictContent
    const resolvedFile = resolvedById.get(storedFile.id)

    if (
      !originalConflictContent ||
      !resolvedFile ||
      hasSimpleConflictMarkers(resolvedFile.content)
    ) {
      continue
    }

    const baseContent = await getArticleFileContent(
      storedFile.filePath,
      input.baseRef,
      input.token
    )
    const resolutions = extractResolvedBlockResolutions({
      originalConflictContent,
      resolvedContent: resolvedFile.content,
      filePath: storedFile.filePath,
      baseContent,
    })

    await Promise.all(
      resolutions.map(({ block, resolution }) =>
        storeRerere(
          block.filePath,
          block.base,
          block.ours,
          block.theirs,
          resolution
        )
      )
    )
  }
}

function getReviewRevalidatePaths(
  revisionId: string,
  prNumber?: number | null
) {
  return [
    "/draft",
    `/draft/${revisionId}`,
    "/review",
    prNumber ? `/review/${prNumber}` : "",
  ].filter(Boolean)
}

async function requireReviewAdminContext() {
  const session = await requireAuth()
  await requireAdmin(session.user.id)

  return {
    session,
    token: await getGithubPatForUser(session.user.id),
    authorName: session.user.name || "GTMC Admin",
    authorEmail: session.user.email || "admin@gtmc.dev",
  }
}

function focusDraftFileByPath(
  draftFiles: DraftFileCollection,
  filePath?: string | null
) {
  if (!filePath) {
    return draftFiles
  }

  const targetFile = draftFiles.files.find((file) => file.filePath === filePath)

  if (!targetFile) {
    return draftFiles
  }

  return normalizeDraftFileCollection({
    activeFileId: targetFile.id,
    folders: draftFiles.folders || [],
    files: draftFiles.files,
  })
}

function getFirstConflictedFilePath(files: DraftFileCollection["files"]) {
  return (
    files.find(
      (file) =>
        file.conflictContent !== undefined && file.conflictContent !== null
    )?.filePath ?? null
  )
}

function buildDraftSnapshot(draftFiles: DraftFileCollection) {
  return {
    activeFileId: draftFiles.activeFileId,
    files: draftFiles.files.map((file) => ({
      id: file.id,
      filePath: file.filePath,
      content: file.content,
      conflictContent: file.conflictContent ?? null,
    })),
  }
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

  await upsertFilesOnBranch(
    input.token,
    input.files.map((file) => ({
      path: file.filePath,
      content: file.content,
    })),
    input.branchName
  )
}

export async function mergePRAction(
  prNumber: number,
  options?: {
    commitBody?: string
    commitTitle?: string
    mergeMethod?: ReviewMergeMethod
  }
) {
  const session = await requireAuth()
  await requireAdmin(session.user.id)

  const token = await getGithubPatForUser(session.user.id)

  try {
    reviewLog("mergePRAction", {
      prNumber,
      status: "start",
      mergeMethod: options?.mergeMethod ?? "auto",
    })
    reviewLog("mergePRAction", {
      prNumber,
      status: "merge-dispatch",
      mergeMethod: options?.mergeMethod ?? "auto",
    })
    await mergePR(prNumber, options, token)
    reviewLog("mergePRAction", {
      prNumber,
      status: "github-api-after",
      operation: "mergePR",
      result: "completed",
    })
    try {
      reviewLog("mergePRAction", {
        prNumber,
        status: "reconcile-start",
        outcome: "PR-merged",
      })
      await reconcileDraftAssetsForPRCompletion({
        prNumber,
        outcome: "PR-merged",
      })
      reviewLog("mergePRAction", {
        prNumber,
        status: "reconcile-complete",
        outcome: "PR-merged",
      })
    } catch (reconcileError) {
      reviewError("mergePRAction", reconcileError, {
        prNumber,
        status: "reconcile-error",
        outcome: "PR-merged",
      })
    }
    revalidatePath("/draft")
    revalidatePath("/review")
    reviewLog("mergePRAction", { prNumber, status: "complete" })
    return { success: true }
  } catch (error) {
    reviewError("mergePRAction", error, { prNumber, status: "error" })
    throw new Error(formatErrorMessage("Merge failed", error))
  }
}

export async function closePRAction(prNumber: number) {
  const session = await requireAuth()
  await requireAdmin(session.user.id)

  const token = await getGithubPatForUser(session.user.id)
  const octokit = getOctokit(token)

  try {
    reviewLog("closePRAction", { prNumber, status: "start" })
    reviewLog("closePRAction", {
      prNumber,
      status: "github-api-before",
      operation: "pulls.update",
      nextState: "closed",
    })
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      state: "closed",
    })
    reviewLog("closePRAction", {
      prNumber,
      status: "github-api-after",
      operation: "pulls.update",
      result: "closed",
    })
    try {
      reviewLog("closePRAction", {
        prNumber,
        status: "reconcile-start",
        outcome: "PR-closed",
      })
      await reconcileDraftAssetsForPRCompletion({
        prNumber,
        outcome: "PR-closed",
      })
      reviewLog("closePRAction", {
        prNumber,
        status: "reconcile-complete",
        outcome: "PR-closed",
      })
    } catch (reconcileError) {
      reviewError("closePRAction", reconcileError, {
        prNumber,
        status: "reconcile-error",
        outcome: "PR-closed",
      })
    }
    revalidatePath("/draft")
    revalidatePath("/review")
    reviewLog("closePRAction", { prNumber, status: "complete" })
    return { success: true }
  } catch (error) {
    reviewError("closePRAction", error, { prNumber, status: "error" })
    throw new Error(formatErrorMessage("Close failed", error))
  }
}

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

    const content = formData.get("content") as string | null
    const draftFilesPayload = formData.get("draftFiles") as string | null

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
      throw new Error("Resolved content is required")
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
    throw new Error(formatErrorMessage("Abort rebase failed", error))
  }
}

export async function keepFileAction(revisionId: string) {
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
    folders: storedDraftFiles.folders || [],
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

    const submitterName = revision.author?.name || authorName
    const submitterEmail = revision.author?.email || authorEmail

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
        contentLength: file.content?.length,
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

export async function finalizeReviewAction(
  prNumber: number,
  options?: {
    commitTitle?: string
    commitBody?: string
    mergeMethod?: ReviewMergeMethod
  }
) {
  reviewLog("finalizeReviewAction", {
    prNumber,
    status: "start",
    commitTitleProvided: Boolean(options?.commitTitle),
    commitBodyProvided: Boolean(options?.commitBody),
    mergeMethod: options?.mergeMethod ?? "auto",
  })

  try {
    const { token, authorName, authorEmail } = await requireReviewAdminContext()

    const revision = await prisma.revision.findFirst({
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

    if (!revision) {
      throw new Error("Linked draft not found")
    }

    const submitterName = revision.author?.name || authorName
    const submitterEmail = revision.author?.email || authorEmail

    const conflictMode = (revision as { conflictMode?: ConflictMode | null })
      .conflictMode
    const rebaseState = revision.rebaseState as RebaseState | null
    const storedDraftFiles = decodeStoredDraftFiles({
      content: revision.content,
      conflictContent: revision.conflictContent,
      filePath: revision.filePath,
    })

    reviewLog("finalizeReviewAction", {
      prNumber,
      revisionId: revision.id,
      status: "loaded",
      conflictMode,
      fileCount: storedDraftFiles.files.length,
    })

    if (conflictMode === "SIMPLE") {
      if (!revision.prBranchName || !revision.syncedMainSha) {
        throw new Error("The linked draft is missing PR metadata")
      }

      if (
        storedDraftFiles.files.some((file) =>
          hasSimpleConflictMarkers(file.content)
        )
      ) {
        throw new Error("Resolve all simple conflicts before finalizing review")
      }

      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "merge-pr-start",
        mode: conflictMode,
        mergeMethod: options?.mergeMethod ?? "auto",
      })
      await mergePR(
        prNumber,
        {
          mergeMethod: options?.mergeMethod,
          commitTitle: options?.commitTitle,
          commitBody: options?.commitBody,
        },
        token
      )
      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "merge-pr-complete",
        mode: conflictMode,
      })
    } else {
      if (!revision.prBranchName) {
        throw new Error("The linked draft is missing PR metadata")
      }

      const latestMainSha = await getMainBranchHeadSha(token)
      const resolvedFiles =
        rebaseState?.fileStates &&
        Object.keys(rebaseState.fileStates).length > 0
          ? Object.values(rebaseState.fileStates).map((fileState) => ({
              filePath: fileState.filePath,
              content: fileState.currentContent,
            }))
          : storedDraftFiles.files.map((file) => ({
              filePath: file.filePath,
              content: file.content,
            }))

      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "force-push-start",
        mode: conflictMode,
        prBranchName: revision.prBranchName,
        fileCount: resolvedFiles.length,
        latestMainSha: summarizeSha(latestMainSha),
      })
      await forcePushResolvedToPRBranch({
        resolvedFiles,
        prBranchName: revision.prBranchName,
        latestMainSha,
        authorName: submitterName,
        authorEmail: submitterEmail,
        token,
      })
      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "force-push-complete",
        mode: conflictMode,
        prBranchName: revision.prBranchName,
      })

      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "merge-pr-start",
        mode: conflictMode,
        mergeMethod: options?.mergeMethod ?? "auto",
      })
      await mergePR(
        prNumber,
        {
          mergeMethod: options?.mergeMethod,
          commitTitle: options?.commitTitle,
          commitBody: options?.commitBody,
        },
        token
      )
      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "merge-pr-complete",
        mode: conflictMode,
      })
    }

    try {
      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "db-cleanup-start",
        operation: "reconcileDraftAssetsForPRCompletion",
      })
      await reconcileDraftAssetsForPRCompletion({
        prNumber,
        outcome: "PR-merged",
      })
      reviewLog("finalizeReviewAction", {
        prNumber,
        status: "db-cleanup-complete",
        operation: "reconcileDraftAssetsForPRCompletion",
      })
    } catch (reconcileError) {
      reviewError("finalizeReviewAction", reconcileError, {
        prNumber,
        status: "db-cleanup-error",
        operation: "reconcileDraftAssetsForPRCompletion",
      })
    }

    revalidatePaths(getReviewRevalidatePaths(revision.id, prNumber))
    reviewLog("finalizeReviewAction", {
      prNumber,
      status: "complete",
      conflictMode,
    })
    return { success: true }
  } catch (error) {
    reviewError("finalizeReviewAction", error, { prNumber, status: "error" })
    throw error
  }
}

export async function abortResolutionAction(revisionId: string) {
  reviewLog("abortResolutionAction", { revisionId, status: "start" })

  try {
    const { token } = await requireReviewAdminContext()

    const revision = await prisma.revision.findUnique({
      where: { id: revisionId },
    })

    if (!revision) {
      throw new Error("Revision not found")
    }

    const conflictMode = (revision as { conflictMode?: ConflictMode | null })
      .conflictMode

    reviewLog("abortResolutionAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "loaded",
      conflictMode,
    })

    if (conflictMode === "FINE_GRAINED") {
      reviewLog("abortResolutionAction", {
        revisionId,
        prNumber: revision.githubPrNum,
        status: "abort-rebase-start",
        mode: conflictMode,
      })
      await abortRebase({
        draftId: revisionId,
        token,
      })
      reviewLog("abortResolutionAction", {
        revisionId,
        prNumber: revision.githubPrNum,
        status: "abort-rebase-complete",
        mode: conflictMode,
      })
    }

    reviewLog("abortResolutionAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "db-write-before",
      fields:
        conflictMode === "SIMPLE"
          ? ["conflictContent", "status", "conflictMode"]
          : ["status", "conflictMode"],
      nextStatus: "IN_REVIEW",
      nextConflictMode: null,
    })
    await prisma.revision.update({
      where: { id: revisionId },
      data: {
        ...(conflictMode === "SIMPLE" ? { conflictContent: null } : {}),
        status: "IN_REVIEW",
        conflictMode: null,
      } as Prisma.RevisionUpdateInput,
    })
    reviewLog("abortResolutionAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "db-write-after",
      fields:
        conflictMode === "SIMPLE"
          ? ["conflictContent", "status", "conflictMode"]
          : ["status", "conflictMode"],
      nextStatus: "IN_REVIEW",
      nextConflictMode: null,
    })

    // Decode original draft files and force-push back to PR branch
    reviewLog("abortResolutionAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "force-push-start",
    })

    const storedDraftFiles = decodeStoredDraftFiles({
      content: revision.content,
      conflictContent: null,
      filePath: revision.filePath,
    })

    const revisionWithAuthor = await prisma.revision.findFirst({
      where: { id: revisionId },
      include: { author: { select: { name: true, email: true } } },
    })
    const submitterName = revisionWithAuthor?.author?.name ?? "gtmc-bot"
    const submitterEmail =
      revisionWithAuthor?.author?.email ?? "gtmc-bot@gtmc.dev"

    const latestMainSha = await getMainBranchHeadSha(token)

    if (revision.prBranchName) {
      await forcePushResolvedToPRBranch({
        resolvedFiles: storedDraftFiles.files.map((f) => ({
          filePath: f.filePath,
          content: f.content,
        })),
        prBranchName: revision.prBranchName,
        latestMainSha,
        commitMessage:
          "chore(review): restore draft branch after resolution abort",
        authorName: submitterName,
        authorEmail: submitterEmail,
        token,
      })

      reviewLog("abortResolutionAction", {
        revisionId,
        prNumber: revision.githubPrNum,
        status: "force-push-complete",
        prBranchName: revision.prBranchName,
      })
    }

    revalidatePaths(getReviewRevalidatePaths(revisionId, revision.githubPrNum))
    reviewLog("abortResolutionAction", {
      revisionId,
      prNumber: revision.githubPrNum,
      status: "complete",
      conflictMode,
    })
    return { success: true }
  } catch (error) {
    reviewError("abortResolutionAction", error, { revisionId, status: "error" })
    throw error
  }
}
