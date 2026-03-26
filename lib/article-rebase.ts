import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github-pr"
import { Prisma } from "@prisma/client"
import {
  getMergeLibrary,
  type MergeConflictBlock,
} from "./article-merge-library"
import type { RebaseCommitInfo, RebaseState } from "../types/rebase"
import { prisma } from "@/lib/prisma"

export type RebaseRecommendation = "REBASE_RECOMMENDED" | "QUICK_MERGE_OK"

export interface RebaseAnalysis {
  recommendation: RebaseRecommendation
  totalCommits: number
  fileEditCount: number
  commitInfos: RebaseCommitInfo[]
  adminMessage: string
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

export type RebaseOutcome =
  | {
      status: "SUCCESS"
      finalContent: string
      appliedCommits: RebaseCommitInfo[]
    }
  | {
      status: "CONFLICT"
      conflictContent: string
      conflictBlock: MergeConflictBlock
      conflictCommit: RebaseCommitInfo
      appliedCommits: RebaseCommitInfo[]
      remainingCommitShas: string[]
    }
  | {
      status: "FILE_DELETED_CONFLICT"
      draftContent: string
      deletedAtCommit: RebaseCommitInfo
      appliedCommits: RebaseCommitInfo[]
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
  resolvedContent: string
  token?: string
}

export type ResumeRebaseOutcome =
  | {
      status: "SUCCESS"
      finalContent: string
      appliedCommits: RebaseCommitInfo[]
    }
  | {
      status: "CONFLICT"
      conflictContent: string
      conflictBlock: MergeConflictBlock
      conflictCommit: RebaseCommitInfo
      appliedCommits: RebaseCommitInfo[]
      remainingCommitShas: string[]
    }
  | {
      status: "FILE_DELETED_CONFLICT"
      draftContent: string
      deletedAtCommit: RebaseCommitInfo
      appliedCommits: RebaseCommitInfo[]
    }
  | { status: "ERROR"; message: string }

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
  } catch {
    return null
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

      const remainingCommitShas = rebaseState.commitInfos
        .slice(i + 1)
        .map((c) => c.sha)

      const conflictState: RebaseState = {
        ...rebaseState,
        status: "CONFLICT",
        currentCommitIndex: i,
        conflictedCommitSha: commit.sha,
        resolvedContent: undefined,
      }

      await prisma.revision.update({
        where: { id: draftId },
        data: {
          rebaseState: conflictState as unknown as Prisma.InputJsonValue,
        },
      })

      return {
        status: "CONFLICT",
        conflictContent: mergeResult.content,
        conflictBlock,
        conflictCommit: commit,
        appliedCommits,
        remainingCommitShas,
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

  const filePath = (revision as { filePath?: string }).filePath
  if (!filePath || !conflictedCommitSha) {
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
    startingContent: input.resolvedContent,
    previousSha: conflictedCommitSha,
    appliedCommitsBefore,
  })
}

export async function analyzeRebaseNeed(
  input: AnalyzeRebaseInput
): Promise<RebaseAnalysis> {
  const { filePath, baseMainSha, latestMainSha, token } = input

  if (baseMainSha === latestMainSha) {
    return {
      recommendation: "QUICK_MERGE_OK",
      totalCommits: 0,
      fileEditCount: 0,
      commitInfos: [],
      adminMessage: "No changes in main since draft was created.",
    }
  }

  const octokit = getOctokit(token)

  const { data: compareData } = await octokit.repos.compareCommits({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    base: baseMainSha,
    head: latestMainSha,
  })

  const totalCommits = compareData.commits.length
  const commitInfos: RebaseCommitInfo[] = []

  for (const commit of compareData.commits) {
    const { data: commitData } = await octokit.repos.getCommit({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      ref: commit.sha,
    })

    const modifiedFile = commitData.files?.some((f) => f.filename === filePath)
    if (modifiedFile) {
      commitInfos.push({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || "Unknown",
        timestamp: commit.commit.author?.date || new Date().toISOString(),
      })
    }
  }

  const fileEditCount = commitInfos.length
  const recommendation: RebaseRecommendation =
    fileEditCount >= 2 ? "REBASE_RECOMMENDED" : "QUICK_MERGE_OK"

  const adminMessage =
    recommendation === "REBASE_RECOMMENDED"
      ? `The article was modified in ${fileEditCount} separate commits. Fine-grained rebase is recommended to resolve each change individually.`
      : `The article was modified in ${fileEditCount === 0 ? "no" : "1"} commit. A quick merge should suffice.`

  return {
    recommendation,
    totalCommits,
    fileEditCount,
    commitInfos,
    adminMessage,
  }
}
