import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import { serializeDraftFilesForStorage } from "@/lib/drafts/files"
import {
  applyAutoAppliedResolutions,
  autoApplyRerere,
  parseConflictBlocks,
} from "@/lib/review/rerere"
import type { ConflictBlock, MergeConflictBlock } from "@/lib/review/rebase-types"
import type { Prisma } from "@prisma/client"
import { getMergeLibrary } from "@/lib/review/merge-strategy"
import type {
  FileRebaseState,
  RebaseCommitInfo,
  RebaseState,
} from "@/lib/review/rebase-types"
import { prisma } from "@/lib/prisma"
import { getFileSnapshot } from "@/lib/articles/snapshot"
import { reviewLog, summarizeSha } from "@/lib/logging"
import type {
  RebaseOutcome,
  ResumeRebaseOutcome,
  RebasedFileContent,
} from "./rebase"

interface CompareCommitFileInfo {
  sha: string
  info: RebaseCommitInfo
  touchedFilePaths: string[]
}

export function buildFileStates(
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

export function fileStatesToFiles(
  fileStates: Record<string, FileRebaseState> | undefined
): RebasedFileContent[] {
  return Object.values(fileStates ?? {}).map((fileState) => ({
    filePath: fileState.filePath,
    content: fileState.currentContent,
  }))
}

export async function autoResolveConflictContent(input: {
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

  reviewLog("applyRerere", {
    filePath: input.filePath,
    status: "start",
    blockCount: blocks.length,
  })

  if (blocks.length === 0) {
    reviewLog("applyRerere", {
      filePath: input.filePath,
      status: "complete",
      matchesFound: 0,
      remainingCount: 0,
    })
    return { content: input.content, applied: [], remaining: [] }
  }

  const { applied, remaining } = await autoApplyRerere(blocks)

  reviewLog("applyRerere", {
    filePath: input.filePath,
    status: "complete",
    matchesFound: applied.length,
    remainingCount: remaining.length,
  })

  return {
    content: applyAutoAppliedResolutions(input.content, applied),
    applied,
    remaining,
  }
}

export function conflictBlockFromRerere(block: ConflictBlock): MergeConflictBlock {
  return {
    type: "conflict",
    ours: block.ours.replace(/\n$/, "").split("\n"),
    base: block.base.replace(/\n$/, "").split("\n"),
    theirs: block.theirs.replace(/\n$/, "").split("\n"),
  }
}

export async function getCompareCommitFileInfos(input: {
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
    // eslint-disable-next-line no-await-in-loop -- sequential: GitHub API rate limiting for potentially many commits
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

export async function analyzeRebaseNeedInternal(input: {
  filePaths: string[]
  baseMainSha: string
  latestMainSha: string
  token?: string
}): Promise<{
  recommendation: "REBASE_RECOMMENDED" | "QUICK_MERGE_OK"
  totalCommits: number
  fileEditCount: number
  commitInfos: RebaseCommitInfo[]
  adminMessage: string
  fileAnalyses?: Array<{
    filePath: string
    fileEditCount: number
    commitInfos: RebaseCommitInfo[]
  }>
}> {
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
  const recommendation = fileAnalyses.some(
    (analysis) => analysis.fileEditCount >= 2
  )
    ? ("REBASE_RECOMMENDED" as const)
    : ("QUICK_MERGE_OK" as const)

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

export async function applyRebaseCommits(input: {
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
    reviewLog("rebaseArticleContent", {
      draftId,
      filePath,
      status: "process-commit",
      commitIndex: i,
      commitSha: summarizeSha(commit.sha),
    })
    // eslint-disable-next-line no-await-in-loop -- sequential rebase: each commit's base depends on previousSha from prior iteration
    const baseSnapshot = await getFileSnapshot(filePath, previousSha, token)
    // eslint-disable-next-line no-await-in-loop -- sequential rebase: snapshot needed for merge in same iteration
    const latestSnapshot = await getFileSnapshot(filePath, commit.sha, token)

    if (!baseSnapshot) {
      continue
    }

    if (!latestSnapshot) {
      const deletedState: RebaseState = {
        ...rebaseState,
        status: "CONFLICT",
        currentCommitIndex: i,
        conflictedCommitSha: commit.sha,
      }
      reviewLog("rebaseArticleContent", {
        draftId,
        filePath,
        status: "db-write-before",
        branch: "FILE_DELETED_CONFLICT",
        commitSha: summarizeSha(commit.sha),
      })
      // eslint-disable-next-line no-await-in-loop -- sequential rebase: DB state update before early return
      await prisma.revision.update({
        where: { id: draftId },
        data: { rebaseState: deletedState as unknown as Prisma.InputJsonValue },
      })
      reviewLog("rebaseArticleContent", {
        draftId,
        filePath,
        status: "db-write-after",
        branch: "FILE_DELETED_CONFLICT",
        commitSha: summarizeSha(commit.sha),
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
      // eslint-disable-next-line no-await-in-loop -- sequential rebase: conflict resolution depends on current merge state
      const rerereResult = await autoResolveConflictContent({
        content: mergeResult.content,
        filePath,
        baseContent: baseSnapshot.content,
      })

      if (
        rerereResult.remaining.length === 0 &&
        rerereResult.applied.length > 0
      ) {
        reviewLog("rebaseArticleContent", {
          draftId,
          filePath,
          status: "commit-auto-resolved",
          commitSha: summarizeSha(commit.sha),
          matchesFound: rerereResult.applied.length,
        })
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

      reviewLog("rebaseArticleContent", {
        draftId,
        filePath,
        status: "db-write-before",
        branch: "CONFLICT",
        commitSha: summarizeSha(commit.sha),
      })
      // eslint-disable-next-line no-await-in-loop -- sequential rebase: DB state update before early return
      await prisma.revision.update({
        where: { id: draftId },
        data: {
          rebaseState: conflictState as unknown as Prisma.InputJsonValue,
        },
      })
      reviewLog("rebaseArticleContent", {
        draftId,
        filePath,
        status: "db-write-after",
        branch: "CONFLICT",
        commitSha: summarizeSha(commit.sha),
      })

      reviewLog("rebaseArticleContent", {
        draftId,
        filePath,
        status: "conflict-detected",
        commitSha: summarizeSha(commit.sha),
        rerereAppliedCount: rerereResult.applied.length,
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

  reviewLog("rebaseArticleContent", {
    draftId,
    filePath,
    status: "db-write-before",
    branch: "COMPLETED",
    commitCount: rebaseState.commitInfos.length,
  })
  await prisma.revision.update({
    where: { id: draftId },
    data: {
      rebaseState: completedState as unknown as Prisma.InputJsonValue,
    },
  })
  reviewLog("rebaseArticleContent", {
    draftId,
    filePath,
    status: "db-write-after",
    branch: "COMPLETED",
    commitCount: rebaseState.commitInfos.length,
  })

  reviewLog("rebaseArticleContent", {
    draftId,
    filePath,
    status: "complete",
    resultStatus: "SUCCESS",
    appliedCommitCount: appliedCommits.length,
  })

  return {
    status: "SUCCESS",
    finalContent: currentContent,
    appliedCommits,
  }
}

export async function applyRebaseCommitsMultiFile(input: {
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
    // eslint-disable-next-line no-await-in-loop -- sequential rebase: each commit replayed in order
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
      // eslint-disable-next-line no-await-in-loop -- sequential rebase: base depends on previousSha from prior commit
      const baseSnapshot = await getFileSnapshot(filePath, previousSha, token)
      // eslint-disable-next-line no-await-in-loop -- sequential rebase: snapshot needed for merge in same iteration
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
        // eslint-disable-next-line no-await-in-loop -- sequential rebase: DB state update before early return
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
        // eslint-disable-next-line no-await-in-loop -- sequential rebase: conflict resolution depends on current merge state
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

        // eslint-disable-next-line no-await-in-loop -- sequential rebase: DB state update before early return
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
      folders: [],
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
