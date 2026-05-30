import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import { serializeDraftFilesForStorage } from "@/lib/drafts/files"
import type { ConflictBlock, MergeConflictBlock } from "@/lib/review/rebase-types"
import type { Prisma } from "@prisma/client"
import type {
  FileRebaseState,
  RebaseCommitInfo,
  RebaseState,
} from "@/lib/review/rebase-types"
import { prisma } from "@/lib/prisma"
import { reviewLog, summarizeSha } from "@/lib/review/logging"
import {
  getCompareCommitFileInfos,
  analyzeRebaseNeedInternal,
  applyRebaseCommits,
  applyRebaseCommitsMultiFile,
  buildFileStates,
} from "./rebase-internal"

export type RebaseRecommendation = "REBASE_RECOMMENDED" | "QUICK_MERGE_OK"

export interface RebaseAnalysis {
  recommendation: RebaseRecommendation
  totalCommits: number
  fileEditCount: number
  commitInfos: RebaseCommitInfo[]
  adminMessage: string
  fileAnalyses?: RebaseFileAnalysis[]
}

export interface RebaseFileAnalysis {
  filePath: string
  fileEditCount: number
  commitInfos: RebaseCommitInfo[]
}

export interface AnalyzeRebaseInput {
  filePath: string
  baseMainSha: string
  latestMainSha: string
  token?: string
}

export interface RebaseInput {
  draftId: string
  filePath: string
  baseMainSha: string
  latestMainSha: string
  draftContent: string
  token?: string
}

export interface MultiFileRebaseInput {
  draftId: string
  files: Array<{ filePath: string; content: string }>
  baseMainSha: string
  latestMainSha: string
  token?: string
}

export interface MultiFileAnalyzeInput {
  files: Array<{ filePath: string }>
  baseMainSha: string
  latestMainSha: string
  token?: string
}

export interface RebasedFileContent {
  filePath: string
  content: string
}

export type RebaseOutcome =
  | {
      status: "SUCCESS"
      finalContent: string
      appliedCommits: RebaseCommitInfo[]
      files?: RebasedFileContent[]
    }
  | {
      status: "CONFLICT"
      conflictContent: string
      conflictBlock: MergeConflictBlock
      conflictCommit: RebaseCommitInfo
      appliedCommits: RebaseCommitInfo[]
      remainingCommitShas: string[]
      files?: RebasedFileContent[]
      conflictFilePath?: string
      rerereApplied?: ConflictBlock[]
    }
  | {
      status: "FILE_DELETED_CONFLICT"
      draftContent: string
      deletedAtCommit: RebaseCommitInfo
      appliedCommits: RebaseCommitInfo[]
      files?: RebasedFileContent[]
      deletedFilePath?: string
    }
  | { status: "NO_CHANGE"; message: string }

export interface AbortRebaseInput {
  draftId: string
  token?: string
}

export type AbortRebaseOutcome =
  | { status: "ABORTED"; originalContent: string }
  | { status: "ERROR"; message: string }

export interface ResumeRebaseInput {
  draftId: string
  resolvedContent?: string
  resolvedFiles?: Array<{ filePath: string; content: string }>
  token?: string
}

export type ResumeRebaseOutcome =
  | {
      status: "SUCCESS"
      finalContent: string
      appliedCommits: RebaseCommitInfo[]
      files?: RebasedFileContent[]
    }
  | {
      status: "CONFLICT"
      conflictContent: string
      conflictBlock: MergeConflictBlock
      conflictCommit: RebaseCommitInfo
      appliedCommits: RebaseCommitInfo[]
      remainingCommitShas: string[]
      files?: RebasedFileContent[]
      conflictFilePath?: string
      rerereApplied?: ConflictBlock[]
    }
  | {
      status: "FILE_DELETED_CONFLICT"
      draftContent: string
      deletedAtCommit: RebaseCommitInfo
      appliedCommits: RebaseCommitInfo[]
      files?: RebasedFileContent[]
      deletedFilePath?: string
    }
  | { status: "ERROR"; message: string }

export async function rebaseArticleContent(
  input: RebaseInput
): Promise<RebaseOutcome> {
  const { draftId, filePath, baseMainSha, latestMainSha, draftContent, token } =
    input

  reviewLog("rebaseArticleContent", {
    draftId,
    filePath,
    status: "start",
    fileCount: 1,
    baseMainSha: summarizeSha(baseMainSha),
    latestMainSha: summarizeSha(latestMainSha),
  })

  if (baseMainSha === latestMainSha) {
    reviewLog("rebaseArticleContent", {
      draftId,
      filePath,
      status: "branch-decision",
      branch: "NO_CHANGE",
      reason: "same-main-sha",
    })
    return { status: "NO_CHANGE", message: "No commits to rebase" }
  }

  const octokit = getOctokit(token)

  const { data: compareData } = await octokit.repos.compareCommits({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    base: baseMainSha,
    head: latestMainSha,
  })

  const relevantCommits: RebaseCommitInfo[] = []
  for (const commit of compareData.commits) {
    // eslint-disable-next-line no-await-in-loop -- sequential: GitHub API rate limiting for potentially many commits
    const { data: commitData } = await octokit.repos.getCommit({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      ref: commit.sha,
    })

    const modifiedFile = commitData.files?.some((f) => f.filename === filePath)
    if (modifiedFile) {
      relevantCommits.push({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || "Unknown",
        timestamp: commit.commit.author?.date || new Date().toISOString(),
      })
    }
  }

  if (relevantCommits.length === 0) {
    reviewLog("rebaseArticleContent", {
      draftId,
      filePath,
      status: "branch-decision",
      branch: "NO_CHANGE",
      reason: "no-relevant-commits",
      commitCount: compareData.commits.length,
    })
    return { status: "NO_CHANGE", message: "No commits modified this file" }
  }

  const initialState: RebaseState = {
    status: "IN_PROGRESS",
    commitShas: relevantCommits.map((c) => c.sha),
    currentCommitIndex: 0,
    originalContent: draftContent,
    commitInfos: relevantCommits,
  }

  reviewLog("rebaseArticleContent", {
    draftId,
    filePath,
    status: "db-write-before",
    branch: "IN_PROGRESS",
    commitCount: relevantCommits.length,
  })
  await prisma.revision.update({
    where: { id: draftId },
    data: {
      rebaseState: initialState as unknown as Prisma.InputJsonValue,
    },
  })
  reviewLog("rebaseArticleContent", {
    draftId,
    filePath,
    status: "db-write-after",
    branch: "IN_PROGRESS",
    commitCount: relevantCommits.length,
  })

  return applyRebaseCommits({
    draftId,
    filePath,
    token,
    rebaseState: initialState,
    startIndex: 0,
    startingContent: draftContent,
    previousSha: baseMainSha,
    appliedCommitsBefore: [],
  })
}

export async function rebaseArticleContentMultiFile(
  input: MultiFileRebaseInput
): Promise<RebaseOutcome> {
  const { draftId, files, baseMainSha, latestMainSha, token } = input

  reviewLog("rebaseArticleContentMultiFile", {
    draftId,
    status: "start",
    fileCount: files.length,
    baseMainSha: summarizeSha(baseMainSha),
    latestMainSha: summarizeSha(latestMainSha),
  })

  if (baseMainSha === latestMainSha) {
    reviewLog("rebaseArticleContentMultiFile", {
      draftId,
      status: "branch-decision",
      branch: "NO_CHANGE",
      reason: "same-main-sha",
    })
    return { status: "NO_CHANGE", message: "No commits to rebase" }
  }

  const normalizedFiles = files.filter((file) => file.filePath)
  const { commitFileInfos } = await getCompareCommitFileInfos({
    filePaths: normalizedFiles.map((file) => file.filePath),
    baseMainSha,
    latestMainSha,
    token,
  })

  if (commitFileInfos.length === 0) {
    reviewLog("rebaseArticleContentMultiFile", {
      draftId,
      status: "branch-decision",
      branch: "NO_CHANGE",
      reason: "no-relevant-commits",
      fileCount: normalizedFiles.length,
    })
    return { status: "NO_CHANGE", message: "No commits modified these files" }
  }

  const draftStorage = serializeDraftFilesForStorage({
    activeFileId: normalizedFiles[0]?.filePath ?? "",
    folders: [],
    files: normalizedFiles.map((file) => ({
      id: file.filePath,
      filePath: file.filePath,
      content: file.content,
    })),
  })

  const initialState: RebaseState = {
    status: "IN_PROGRESS",
    commitShas: commitFileInfos.map((commit) => commit.sha),
    currentCommitIndex: 0,
    originalContent: draftStorage.content,
    commitInfos: commitFileInfos.map((commit) => commit.info),
    fileStates: buildFileStates(normalizedFiles),
  }

  reviewLog("rebaseArticleContentMultiFile", {
    draftId,
    status: "db-write-before",
    branch: "IN_PROGRESS",
    commitCount: commitFileInfos.length,
    fileCount: normalizedFiles.length,
  })
  await prisma.revision.update({
    where: { id: draftId },
    data: {
      rebaseState: initialState as unknown as Prisma.InputJsonValue,
    },
  })
  reviewLog("rebaseArticleContentMultiFile", {
    draftId,
    status: "db-write-after",
    branch: "IN_PROGRESS",
    commitCount: commitFileInfos.length,
    fileCount: normalizedFiles.length,
  })

  return applyRebaseCommitsMultiFile({
    draftId,
    token,
    rebaseState: initialState,
    startIndex: 0,
    previousSha: baseMainSha,
    appliedCommitsBefore: [],
  })
}

export async function abortRebase(
  input: AbortRebaseInput
): Promise<AbortRebaseOutcome> {
  reviewLog("abortRebase", { draftId: input.draftId, status: "start" })
  const revision = await prisma.revision.findUnique({
    where: { id: input.draftId },
  })

  const rebaseState = (revision?.rebaseState as RebaseState | null) ?? null

  if (
    !rebaseState ||
    (rebaseState.status !== "IN_PROGRESS" && rebaseState.status !== "CONFLICT")
  ) {
    reviewLog("abortRebase", {
      draftId: input.draftId,
      status: "branch-decision",
      branch: "NO_ACTIVE_REBASE",
    })
    return { status: "ERROR", message: "No active rebase to abort" }
  }

  const originalContent = rebaseState.originalContent

  reviewLog("abortRebase", {
    draftId: input.draftId,
    status: "db-write-before",
    fields: ["content", "rebaseState"],
  })
  await prisma.revision.update({
    where: { id: input.draftId },
    data: {
      content: originalContent,
      rebaseState: {
        ...rebaseState,
        status: "ABORTED",
      } as unknown as Prisma.InputJsonValue,
    },
  })

  reviewLog("abortRebase", {
    draftId: input.draftId,
    status: "db-write-after",
    fields: ["content", "rebaseState"],
    restoredContentLength: originalContent.length,
  })

  reviewLog("abortRebase", {
    draftId: input.draftId,
    status: "complete",
  })

  return { status: "ABORTED", originalContent }
}

export async function resumeRebase(
  input: ResumeRebaseInput
): Promise<ResumeRebaseOutcome> {
  const revision = await prisma.revision.findUnique({
    where: { id: input.draftId },
  })

  if (!revision) {
    return { status: "ERROR", message: "No conflict to resume from" }
  }

  const rebaseState = (revision.rebaseState as RebaseState | null) ?? null

  if (!rebaseState || rebaseState.status !== "CONFLICT") {
    return { status: "ERROR", message: "No conflict to resume from" }
  }

  const conflictedCommitSha =
    rebaseState.conflictedCommitSha ||
    rebaseState.commitShas[rebaseState.currentCommitIndex]

  if (!conflictedCommitSha) {
    return { status: "ERROR", message: "No conflict to resume from" }
  }

  if (
    rebaseState.fileStates &&
    Object.keys(rebaseState.fileStates).length > 0
  ) {
    const resolvedFilesMap = new Map(
      (input.resolvedFiles ?? []).map((file) => [file.filePath, file.content])
    )
    const nextFileStates: Record<string, FileRebaseState> = Object.fromEntries(
      Object.entries(rebaseState.fileStates).map(([filePath, fileState]) => [
        filePath,
        {
          ...fileState,
          currentContent:
            resolvedFilesMap.get(filePath) ??
            (fileState.status === "conflict"
              ? (input.resolvedContent ?? fileState.currentContent)
              : fileState.currentContent),
          status:
            fileState.status === "conflict"
              ? ("completed" as const)
              : fileState.status,
        },
      ])
    )

    return applyRebaseCommitsMultiFile({
      draftId: input.draftId,
      token: input.token,
      rebaseState: {
        ...rebaseState,
        status: "IN_PROGRESS",
        fileStates: nextFileStates,
      },
      startIndex: rebaseState.currentCommitIndex + 1,
      previousSha: conflictedCommitSha,
      appliedCommitsBefore: rebaseState.commitInfos.slice(
        0,
        rebaseState.currentCommitIndex
      ),
    })
  }

  const filePath = (revision as { filePath?: string }).filePath
  if (!filePath) {
    return { status: "ERROR", message: "No conflict to resume from" }
  }

  const appliedCommitsBefore = rebaseState.commitInfos.slice(
    0,
    rebaseState.currentCommitIndex
  )

  return applyRebaseCommits({
    draftId: input.draftId,
    filePath,
    token: input.token,
    rebaseState,
    startIndex: rebaseState.currentCommitIndex + 1,
    startingContent: input.resolvedContent ?? "",
    previousSha: conflictedCommitSha,
    appliedCommitsBefore,
  })
}

export async function analyzeRebaseNeedMultiFile(
  input: MultiFileAnalyzeInput
): Promise<RebaseAnalysis> {
  return analyzeRebaseNeedInternal({
    filePaths: input.files.map((file) => file.filePath),
    baseMainSha: input.baseMainSha,
    latestMainSha: input.latestMainSha,
    token: input.token,
  })
}

export async function analyzeRebaseNeed(
  input: AnalyzeRebaseInput
): Promise<RebaseAnalysis> {
  const result = await analyzeRebaseNeedInternal({
    filePaths: [input.filePath],
    baseMainSha: input.baseMainSha,
    latestMainSha: input.latestMainSha,
    token: input.token,
  })

  if (input.baseMainSha === input.latestMainSha) {
    return result
  }

  return {
    recommendation: result.recommendation,
    totalCommits: result.totalCommits,
    fileEditCount: result.fileEditCount,
    commitInfos: result.commitInfos,
    adminMessage:
      result.commitInfos.length >= 2
        ? `The article was modified in ${result.fileEditCount} separate commits. Fine-grained rebase is recommended to resolve each change individually.`
        : `The article was modified in ${result.fileEditCount === 0 ? "no" : "1"} commit. A quick merge should suffice.`,
    fileAnalyses: result.fileAnalyses,
  }
}
