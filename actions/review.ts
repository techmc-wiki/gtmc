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
import { requireRecentAuth } from "@/lib/admin-reauth"
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
import type { ConflictMode } from "@/types/review"

const owner = ARTICLES_REPO_OWNER
const repo = ARTICLES_REPO_NAME
const SIMPLE_CONFLICT_MARKER_RE = new RegExp(
  SIMPLE_CONFLICT_BLOCK_RE.source,
  "g"
)

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
  requireRecentAuth(session)

  return {
    session,
    token: await getGithubPatForUser(session.user.id),
    authorName: session.user.name || "GTMC Admin",
    authorEmail: session.user.email || "admin@gtmc.dev",
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
      merge_method: "squash",
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
  const { session, token, authorName, authorEmail } =
    await requireReviewAdminContext()

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

  const conflictMode = (linkedDraft as { conflictMode?: ConflictMode | null })
    .conflictMode

  if (conflictMode === "SIMPLE") {
    const storedFileMap = new Map(
      storedDraftFiles.files.map((file) => [file.id, file])
    )
    const nextDraftFiles = normalizeDraftFileCollection({
      activeFileId: resolvedDraftFiles.activeFileId,
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
    const nextStorage = serializeDraftFilesForStorage(nextDraftFiles)
    const nextStatus = nextDraftFiles.files.some(
      (file) =>
        file.conflictContent !== undefined && file.conflictContent !== null
    )
      ? "SYNC_CONFLICT"
      : "IN_REVIEW"

    await recordResolvedRerereEntries({
      token,
      storedFiles: storedDraftFiles.files,
      resolvedFiles: nextDraftFiles.files,
      baseRef: linkedDraft.baseMainSha,
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

    revalidatePaths(getReviewRevalidatePaths(linkedDraft.id, prNumber))

    return { success: true, status: nextStatus }
  }

  const rebaseState = linkedDraft.rebaseState as RebaseState | null

  if (rebaseState?.status === "CONFLICT") {
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

    if (result.status === "SUCCESS") {
      const rebasedDraftFiles = applyRebasedFilesToDraft(
        storedDraftFiles,
        result.files,
        { filePath: storedFile.filePath, content: result.finalContent }
      )
      await persistRebasedBranchFiles({
        authorEmail,
        authorName,
        branchName: linkedDraft.prBranchName,
        files: rebasedDraftFiles.files.map((file) => ({
          filePath: file.filePath,
          content: file.content,
        })),
        message: `docs: apply rebase for ${linkedDraft.title}`,
        token,
      })
      const rebasedDraftStorage =
        serializeDraftFilesForStorage(rebasedDraftFiles)
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
      const conflictDraftStorage = serializeDraftFilesForStorage(
        applyRebasedFilesToDraft(storedDraftFiles, result.files, undefined, {
          filePath: result.conflictFilePath ?? storedFile.filePath,
          content: result.conflictContent,
        })
      )
      await prisma.revision.update({
        where: { id: linkedDraft.id },
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
        where: { id: linkedDraft.id },
        data: {
          status: "SYNC_CONFLICT",
          content: deletedConflictDraftStorage.content,
          filePath: deletedConflictDraftStorage.filePath,
          conflictContent: deletedConflictDraftStorage.conflictContent,
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
  const { token, authorName, authorEmail } = await requireReviewAdminContext()

  const revision = await prisma.revision.findUnique({
    where: { id: revisionId },
  })

  if (!revision) {
    throw new Error("Revision not found")
  }

  if (!revision.prBranchName) {
    throw new Error("The revision is missing PR metadata")
  }

  const storedDraftFiles = decodeStoredDraftFiles({
    content: revision.content,
    conflictContent: revision.conflictContent,
    filePath: revision.filePath,
  })
  const draftFile = getActiveDraftFile(storedDraftFiles)

  await prisma.revision.update({
    where: { id: revisionId },
    data: {
      conflictMode: mode,
    } as Prisma.RevisionUpdateInput,
  })

  if (mode === "FINE_GRAINED") {
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
      const rebasedDraftStorage =
        serializeDraftFilesForStorage(rebasedDraftFiles)
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

    return { success: true, status: result.status, conflictMode: mode }
  }

  if (!revision.baseMainSha || !revision.syncedMainSha) {
    throw new Error("The revision is missing main SHA metadata")
  }

  const latestMainSha =
    revision.syncedMainSha || (await getMainBranchHeadSha(token))
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
  const result = await resolveSimpleConflicts({
    files: fileInputs,
    prBranchName: revision.prBranchName,
    latestMainSha,
    token,
  })
  const mergedDraftFiles = normalizeDraftFileCollection({
    activeFileId: storedDraftFiles.activeFileId,
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
  })
  const mergedDraftStorage = serializeDraftFilesForStorage(mergedDraftFiles)

  await prisma.revision.update({
    where: { id: revisionId },
    data: {
      conflictContent: mergedDraftStorage.conflictContent,
      content: mergedDraftStorage.content,
      filePath: mergedDraftStorage.filePath,
      status: result.hasConflicts ? "SYNC_CONFLICT" : "IN_REVIEW",
      syncedMainSha: latestMainSha,
    },
  })

  revalidatePaths(getReviewRevalidatePaths(revisionId, revision.githubPrNum))

  return {
    success: true,
    status: result.hasConflicts ? "CONFLICT" : "CLEAN",
    conflictMode: mode,
  }
}

export async function finalizeReviewAction(
  prNumber: number,
  options?: { commitTitle?: string; commitBody?: string }
) {
  const { token } = await requireReviewAdminContext()

  const revision = await prisma.revision.findFirst({
    where: { githubPrNum: prNumber },
  })

  if (!revision) {
    throw new Error("Linked draft not found")
  }

  const conflictMode = (revision as { conflictMode?: ConflictMode | null })
    .conflictMode
  const storedDraftFiles = decodeStoredDraftFiles({
    content: revision.content,
    conflictContent: revision.conflictContent,
    filePath: revision.filePath,
  })

  if (conflictMode === "SIMPLE") {
    if (!revision.prBranchName || !revision.syncedMainSha) {
      throw new Error("The linked draft is missing PR metadata")
    }

    if (
      storedDraftFiles.files.some(
        (file) =>
          file.conflictContent !== undefined && file.conflictContent !== null
      )
    ) {
      throw new Error("Resolve all simple conflicts before finalizing review")
    }

    await forcePushResolvedToPRBranch({
      resolvedFiles: storedDraftFiles.files.map((file) => ({
        filePath: file.filePath,
        content: file.content,
      })),
      prBranchName: revision.prBranchName,
      latestMainSha: revision.syncedMainSha,
      commitMessage: options?.commitTitle,
      token,
    })

    await mergePR(
      prNumber,
      {
        mergeMethod: "squash",
        commitTitle: options?.commitTitle,
        commitBody: options?.commitBody,
      },
      token
    )
  } else {
    await mergePR(
      prNumber,
      {
        mergeMethod: "rebase",
      },
      token
    )
  }

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

  revalidatePaths(getReviewRevalidatePaths(revision.id, prNumber))

  return { success: true }
}

export async function abortResolutionAction(revisionId: string) {
  const { token } = await requireReviewAdminContext()

  const revision = await prisma.revision.findUnique({
    where: { id: revisionId },
  })

  if (!revision) {
    throw new Error("Revision not found")
  }

  const conflictMode = (revision as { conflictMode?: ConflictMode | null })
    .conflictMode

  if (conflictMode === "FINE_GRAINED") {
    await abortRebase({
      draftId: revisionId,
      token,
    })
  }

  await prisma.revision.update({
    where: { id: revisionId },
    data: {
      ...(conflictMode === "SIMPLE" ? { conflictContent: null } : {}),
      conflictMode: null,
    } as Prisma.RevisionUpdateInput,
  })

  revalidatePaths(getReviewRevalidatePaths(revisionId, revision.githubPrNum))

  return { success: true }
}
