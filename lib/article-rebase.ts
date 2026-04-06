import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import { serializeDraftFilesForStorage } from "@/lib/draft-files"
import {
  applyAutoAppliedResolutions,
  autoApplyRerere,
  parseConflictBlocks,
  type ConflictBlock,
} from "@/lib/rerere"
import { Prisma } from "@prisma/client"
import { getMergeLibrary, type MergeConflictBlock } from "./merge-strategy"
import type {
  FileRebaseState,
  RebaseCommitInfo,
  RebaseState,
} from "../types/rebase"
import { prisma } from "@/lib/prisma"

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

interface CompareCommitFileInfo {
  sha: string
  info: RebaseCommitInfo
  touchedFilePaths: string[]
}

async function getFileSnapshot(
  filePath: string,
  ref: string,
  token?: string
): Promise<{ content: string; sha?: string } | null> {
  const octokit = getOctokit(token)

  try {
    const { data } = await octokit.repos.getContent({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      path: filePath,
      ref,
    })

    if (Array.isArray(data) || data.type !== "file") {
      return null
    }

    return {
      content: Buffer.from(data.content, "base64").toString("utf-8"),
      sha: data.sha,
    }
  } catch (error) {
    console.error(
      "[article-rebase] getFileSnapshot failed:",
      filePath,
      ref,
      error
    )
    return null
  }
}

function buildFileStates(
  files: Array<{ filePath: string; content: string }>
): Record<string, FileRebaseState> {
  return Object.fromEntries(
    files.map((file) => [
      file.filePath,
      {
        filePath: file.filePath,
        status: "pending",
        currentContent: file.content,
        originalContent: file.content,
      } satisfies FileRebaseState,
    ])
  )
}

function fileStatesToFiles(
  fileStates: Record<string, FileRebaseState> | undefined
): RebasedFileContent[] {
  return Object.values(fileStates ?? {}).map((fileState) => ({
    filePath: fileState.filePath,
    content: fileState.currentContent,
  }))
}

async function autoResolveConflictContent(input: {
  content: string
  filePath: string
  baseContent: string
}): Promise<{
  content: string
  applied: ConflictBlock[]
  remaining: ConflictBlock[]
}> {
  const blocks = parseConflictBlocks(
    input.content,
    input.filePath,
    input.baseContent
  )

  if (blocks.length === 0) {
    return { content: input.content, applied: [], remaining: [] }
  }

  const { applied, remaining } = await autoApplyRerere(blocks)

  return {
    content: applyAutoAppliedResolutions(input.content, applied),
    applied,
    remaining,
  }
}

function conflictBlockFromRerere(block: ConflictBlock): MergeConflictBlock {
  return {
    type: "conflict",
    ours: block.ours.replace(/\n$/, "").split("\n"),
    base: block.base.replace(/\n$/, "").split("\n"),
    theirs: block.theirs.replace(/\n$/, "").split("\n"),
  }
}

async function getCompareCommitFileInfos(input: {
  filePaths: string[]
  baseMainSha: string
  latestMainSha: string
  token?: string
}): Promise<{
  totalCommits: number
  commitFileInfos: CompareCommitFileInfo[]
}> {
  const { filePaths, baseMainSha, latestMainSha, token } = input

  if (baseMainSha === latestMainSha) {
    return { totalCommits: 0, commitFileInfos: [] }
  }

  const trackedPaths = new Set(filePaths)
  const octokit = getOctokit(token)

  const { data: compareData } = await octokit.repos.compareCommits({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    base: baseMainSha,
    head: latestMainSha,
  })

  const commitFileInfos: CompareCommitFileInfo[] = []

  for (const commit of compareData.commits) {
    const { data: commitData } = await octokit.repos.getCommit({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      ref: commit.sha,
    })

    const touchedFilePaths =
      commitData.files
        ?.map((file) => file.filename)
        .filter((filePath): filePath is string => trackedPaths.has(filePath)) ??
      []

    if (touchedFilePaths.length === 0) {
      continue
    }

    commitFileInfos.push({
      sha: commit.sha,
      info: {
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || "Unknown",
        timestamp: commit.commit.author?.date || new Date().toISOString(),
      },
      touchedFilePaths,
    })
  }

  return {
    totalCommits: compareData.commits.length,
    commitFileInfos,
  }
}

async function analyzeRebaseNeedInternal(input: {
  filePaths: string[]
  baseMainSha: string
  latestMainSha: string
  token?: string
}): Promise<RebaseAnalysis> {
  const { filePaths, baseMainSha, latestMainSha, token } = input

  if (baseMainSha === latestMainSha) {
    return {
      recommendation: "QUICK_MERGE_OK",
      totalCommits: 0,
      fileEditCount: 0,
      commitInfos: [],
      adminMessage: "No changes in main since draft was created.",
      fileAnalyses: filePaths.map((filePath) => ({
        filePath,
        fileEditCount: 0,
        commitInfos: [],
      })),
    }
  }

  const { totalCommits, commitFileInfos } = await getCompareCommitFileInfos({
    filePaths,
    baseMainSha,
    latestMainSha,
    token,
  })

  const perFileCommits = new Map<string, RebaseCommitInfo[]>()
  for (const filePath of filePaths) {
    perFileCommits.set(filePath, [])
  }

  for (const commit of commitFileInfos) {
    for (const filePath of commit.touchedFilePaths) {
      perFileCommits.get(filePath)?.push(commit.info)
    }
  }

  const fileAnalyses = filePaths.map((filePath) => ({
    filePath,
    fileEditCount: perFileCommits.get(filePath)?.length ?? 0,
    commitInfos: perFileCommits.get(filePath) ?? [],
  }))

  const fileEditCount = fileAnalyses.reduce(
    (sum, analysis) => sum + analysis.fileEditCount,
    0
  )
  const recommendation: RebaseRecommendation = fileAnalyses.some(
    (analysis) => analysis.fileEditCount >= 2
  )
    ? "REBASE_RECOMMENDED"
    : "QUICK_MERGE_OK"

  const adminMessage =
    recommendation === "REBASE_RECOMMENDED"
      ? `Main modified ${fileAnalyses.filter((analysis) => analysis.fileEditCount > 0).length || "no"} tracked file${fileAnalyses.filter((analysis) => analysis.fileEditCount > 0).length === 1 ? "" : "s"} across ${fileEditCount} file-level edit${fileEditCount === 1 ? "" : "s"}. Fine-grained rebase is recommended.`
      : `Main modified the tracked files in ${fileEditCount === 0 ? "no" : fileEditCount} file-level edit${fileEditCount === 1 ? "" : "s"}. A quick merge should suffice.`

  return {
    recommendation,
    totalCommits,
    fileEditCount,
    commitInfos: commitFileInfos.map((commit) => commit.info),
    adminMessage,
    fileAnalyses,
  }
}

async function applyRebaseCommits(input: {
  draftId: string
  filePath: string
  token?: string
  rebaseState: RebaseState
  startIndex: number
  startingContent: string
  previousSha: string
  appliedCommitsBefore: RebaseCommitInfo[]
}): Promise<
  Extract<
    RebaseOutcome | ResumeRebaseOutcome,
    { status: "SUCCESS" | "CONFLICT" | "FILE_DELETED_CONFLICT" }
  >
> {
  const {
    draftId,
    filePath,
    token,
    rebaseState,
    startIndex,
    startingContent,
    previousSha: initialPreviousSha,
    appliedCommitsBefore,
  } = input

  let currentContent = startingContent
  let previousSha = initialPreviousSha
  const appliedCommits = [...appliedCommitsBefore]

  for (let i = startIndex; i < rebaseState.commitInfos.length; i++) {
    const commit = rebaseState.commitInfos[i]
    const baseSnapshot = await getFileSnapshot(filePath, previousSha, token)
    const latestSnapshot = await getFileSnapshot(filePath, commit.sha, token)

    if (!baseSnapshot) {
      // Missing base is unexpected — skip this commit
      continue
    }

    if (!latestSnapshot) {
      // File was deleted in this commit but draft has content — deletion conflict
      const deletedState: RebaseState = {
        ...rebaseState,
        status: "CONFLICT",
        currentCommitIndex: i,
        conflictedCommitSha: commit.sha,
      }
      await prisma.revision.update({
        where: { id: draftId },
        data: { rebaseState: deletedState as unknown as Prisma.InputJsonValue },
      })
      return {
        status: "FILE_DELETED_CONFLICT",
        draftContent: currentContent,
        deletedAtCommit: commit,
        appliedCommits,
      }
    }

    const mergeResult = getMergeLibrary().merge({
      baseContent: baseSnapshot.content,
      draftContent: currentContent,
      latestMainContent: latestSnapshot.content,
    })

    if (mergeResult.conflict) {
      const conflictBlock = mergeResult.blocks.find(
        (b) => b.type === "conflict"
      ) as MergeConflictBlock
      const rerereResult = await autoResolveConflictContent({
        content: mergeResult.content,
        filePath,
        baseContent: baseSnapshot.content,
      })

      if (
        rerereResult.remaining.length === 0 &&
        rerereResult.applied.length > 0
      ) {
        currentContent = rerereResult.content
        appliedCommits.push(commit)
        previousSha = commit.sha
        continue
      }

      const remainingCommitShas = rebaseState.commitInfos
        .slice(i + 1)
        .map((c) => c.sha)

      const conflictState: RebaseState = {
        ...rebaseState,
        status: "CONFLICT",
        currentCommitIndex: i,
        conflictedCommitSha: commit.sha,
        resolvedContent: undefined,
        rerereApplied: rerereResult.applied,
      }

      await prisma.revision.update({
        where: { id: draftId },
        data: {
          rebaseState: conflictState as unknown as Prisma.InputJsonValue,
        },
      })

      return {
        status: "CONFLICT",
        conflictContent: rerereResult.content,
        conflictBlock:
          rerereResult.remaining[0] !== undefined
            ? conflictBlockFromRerere(rerereResult.remaining[0])
            : conflictBlock,
        conflictCommit: commit,
        appliedCommits,
        remainingCommitShas,
        rerereApplied: rerereResult.applied,
      }
    }

    currentContent = mergeResult.content
    appliedCommits.push(commit)
    previousSha = commit.sha
  }

  const completedState: RebaseState = {
    ...rebaseState,
    status: "COMPLETED",
    currentCommitIndex: rebaseState.commitInfos.length,
    conflictedCommitSha: undefined,
    resolvedContent: currentContent,
  }

  await prisma.revision.update({
    where: { id: draftId },
    data: {
      rebaseState: completedState as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    status: "SUCCESS",
    finalContent: currentContent,
    appliedCommits,
  }
}

async function applyRebaseCommitsMultiFile(input: {
  draftId: string
  token?: string
  rebaseState: RebaseState
  startIndex: number
  previousSha: string
  appliedCommitsBefore: RebaseCommitInfo[]
}): Promise<
  Extract<
    RebaseOutcome | ResumeRebaseOutcome,
    { status: "SUCCESS" | "CONFLICT" | "FILE_DELETED_CONFLICT" }
  >
> {
  const {
    draftId,
    token,
    rebaseState,
    startIndex,
    previousSha: initialPreviousSha,
  } = input

  const fileStates = Object.fromEntries(
    Object.entries(rebaseState.fileStates ?? {}).map(
      ([filePath, fileState]) => [filePath, { ...fileState }]
    )
  )
  const trackedFilePaths = Object.keys(fileStates)
  const appliedCommits = [...input.appliedCommitsBefore]
  const octokit = getOctokit(token)
  let previousSha = initialPreviousSha

  for (let i = startIndex; i < rebaseState.commitInfos.length; i++) {
    const commit = rebaseState.commitInfos[i]
    const { data: commitData } = await octokit.repos.getCommit({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      ref: commit.sha,
    })

    const touchedFilePaths =
      commitData.files
        ?.map((file) => file.filename)
        .filter((filePath): filePath is string =>
          trackedFilePaths.includes(filePath)
        ) ?? []

    for (const filePath of touchedFilePaths) {
      fileStates[filePath] = {
        ...fileStates[filePath],
        status: "in_progress",
      }
    }

    for (const filePath of touchedFilePaths) {
      const currentFileState = fileStates[filePath]
      const baseSnapshot = await getFileSnapshot(filePath, previousSha, token)
      const latestSnapshot = await getFileSnapshot(filePath, commit.sha, token)

      if (!latestSnapshot) {
        const nextFileStates: Record<string, FileRebaseState> = {
          ...fileStates,
          [filePath]: {
            ...currentFileState,
            status: "conflict" as const,
          },
        }
        const deletedState: RebaseState = {
          ...rebaseState,
          status: "CONFLICT",
          currentCommitIndex: i,
          conflictedCommitSha: commit.sha,
          fileStates: nextFileStates,
        }
        await prisma.revision.update({
          where: { id: draftId },
          data: {
            rebaseState: deletedState as unknown as Prisma.InputJsonValue,
          },
        })
        return {
          status: "FILE_DELETED_CONFLICT",
          draftContent: currentFileState.currentContent,
          deletedAtCommit: commit,
          appliedCommits,
          files: fileStatesToFiles(nextFileStates),
          deletedFilePath: filePath,
        }
      }

      const mergeResult = getMergeLibrary().merge({
        baseContent: baseSnapshot?.content ?? "",
        draftContent: currentFileState.currentContent,
        latestMainContent: latestSnapshot.content,
      })

      if (mergeResult.conflict) {
        const conflictBlock = mergeResult.blocks.find(
          (block) => block.type === "conflict"
        ) as MergeConflictBlock
        const rerereResult = await autoResolveConflictContent({
          content: mergeResult.content,
          filePath,
          baseContent: baseSnapshot?.content ?? "",
        })

        if (
          rerereResult.remaining.length === 0 &&
          rerereResult.applied.length > 0
        ) {
          fileStates[filePath] = {
            ...currentFileState,
            status: "completed",
            currentContent: rerereResult.content,
          }
          continue
        }

        const remainingCommitShas = rebaseState.commitInfos
          .slice(i + 1)
          .map((nextCommit) => nextCommit.sha)
        const nextFileStates: Record<string, FileRebaseState> = {
          ...fileStates,
          [filePath]: {
            ...currentFileState,
            status: "conflict" as const,
          },
        }
        const conflictState: RebaseState = {
          ...rebaseState,
          status: "CONFLICT",
          currentCommitIndex: i,
          conflictedCommitSha: commit.sha,
          resolvedContent: undefined,
          fileStates: nextFileStates,
          rerereApplied: rerereResult.applied,
        }

        await prisma.revision.update({
          where: { id: draftId },
          data: {
            rebaseState: conflictState as unknown as Prisma.InputJsonValue,
          },
        })

        return {
          status: "CONFLICT",
          conflictContent: rerereResult.content,
          conflictBlock:
            rerereResult.remaining[0] !== undefined
              ? conflictBlockFromRerere(rerereResult.remaining[0])
              : conflictBlock,
          conflictCommit: commit,
          appliedCommits,
          remainingCommitShas,
          files: fileStatesToFiles(nextFileStates),
          conflictFilePath: filePath,
          rerereApplied: rerereResult.applied,
        }
      }

      fileStates[filePath] = {
        ...currentFileState,
        status: "completed",
        currentContent: mergeResult.content,
      }
    }

    appliedCommits.push(commit)
    previousSha = commit.sha
  }

  const completedState: RebaseState = {
    ...rebaseState,
    status: "COMPLETED",
    currentCommitIndex: rebaseState.commitInfos.length,
    conflictedCommitSha: undefined,
    resolvedContent: serializeDraftFilesForStorage({
      activeFileId: Object.values(fileStates)[0]?.filePath ?? "",
      files: fileStatesToFiles(fileStates).map((file) => ({
        id: file.filePath,
        filePath: file.filePath,
        content: file.content,
      })),
    }).content,
    fileStates,
  }

  await prisma.revision.update({
    where: { id: draftId },
    data: {
      rebaseState: completedState as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    status: "SUCCESS",
    finalContent: Object.values(fileStates)[0]?.currentContent ?? "",
    appliedCommits,
    files: fileStatesToFiles(fileStates),
  }
}

export async function rebaseArticleContent(
  input: RebaseInput
): Promise<RebaseOutcome> {
  const { draftId, filePath, baseMainSha, latestMainSha, draftContent, token } =
    input

  if (baseMainSha === latestMainSha) {
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
    return { status: "NO_CHANGE", message: "No commits modified this file" }
  }

  const initialState: RebaseState = {
    status: "IN_PROGRESS",
    commitShas: relevantCommits.map((c) => c.sha),
    currentCommitIndex: 0,
    originalContent: draftContent,
    commitInfos: relevantCommits,
  }

  await prisma.revision.update({
    where: { id: draftId },
    data: {
      rebaseState: initialState as unknown as Prisma.InputJsonValue,
    },
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

  if (baseMainSha === latestMainSha) {
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
    return { status: "NO_CHANGE", message: "No commits modified these files" }
  }

  const draftStorage = serializeDraftFilesForStorage({
    activeFileId: normalizedFiles[0]?.filePath ?? "",
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

  await prisma.revision.update({
    where: { id: draftId },
    data: {
      rebaseState: initialState as unknown as Prisma.InputJsonValue,
    },
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
  const revision = await prisma.revision.findUnique({
    where: { id: input.draftId },
  })

  const rebaseState = (revision?.rebaseState as RebaseState | null) ?? null

  if (
    !rebaseState ||
    (rebaseState.status !== "IN_PROGRESS" && rebaseState.status !== "CONFLICT")
  ) {
    return { status: "ERROR", message: "No active rebase to abort" }
  }

  const originalContent = rebaseState.originalContent

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
