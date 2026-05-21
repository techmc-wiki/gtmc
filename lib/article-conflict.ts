import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import type { ConflictBlock } from "@/types/rebase"
import {
  applyAutoAppliedResolutions,
  autoApplyRerere,
  parseConflictBlocks,
} from "@/lib/rerere"
import { GIT_BLOB_MODE } from "@/lib/github/constants"
import { getMergeLibrary } from "@/lib/merge-strategy"
import { reviewLog, summarizeSha } from "@/lib/review/logging"
import {
  getActiveDraftFile,
  getDuplicateDraftFilePaths,
  normalizeDraftFileCollection,
  type DraftFileRecord,
} from "@/lib/draft-files"
import {
  getMainBranchHeadSha,
  resolveArticleFilePath,
  upsertFileOnBranch,
} from "@/lib/article-branch"

type DraftSyncStatus = "IN_REVIEW" | "SYNC_CONFLICT"

interface DraftResolutionInput {
  activeFileId?: string
  branchName: string
  title: string
  files: DraftFileRecord[]
  syncedMainSha?: string | null
  authorName: string
  authorEmail: string
  token?: string
}

export interface SimpleResolutionInput {
  files: Array<{
    filePath: string
    baseContent: string
    draftContent: string
    latestMainContent: string
  }>
  prBranchName: string
  latestMainSha: string
  token?: string
}

export interface SimpleResolutionResult {
  fileResults: Array<{
    filePath: string
    status: "clean" | "conflict"
    content: string
    rerereApplied?: ConflictBlock[]
  }>
  hasConflicts: boolean
}

export interface ForcePushInput {
  resolvedFiles: Array<{ filePath: string; content: string }>
  prBranchName: string
  latestMainSha: string
  commitMessage?: string
  authorName?: string
  authorEmail?: string
  token?: string
}

export async function resolveSimpleConflicts(
  input: SimpleResolutionInput
): Promise<SimpleResolutionResult> {
  const mergeLibrary = getMergeLibrary()
  const fileResults = await Promise.all(
    input.files.map(async (file) => {
      const result = mergeLibrary.merge({
        baseContent: file.baseContent,
        draftContent: file.draftContent,
        latestMainContent: file.latestMainContent,
      })

      if (!result.conflict) {
        return {
          filePath: file.filePath,
          status: "clean" as const,
          content: result.content,
        }
      }

      const blocks = parseConflictBlocks(
        result.content,
        file.filePath,
        file.baseContent
      )
      const { applied, remaining } = await autoApplyRerere(blocks)
      const resolvedContent = applyAutoAppliedResolutions(
        result.content,
        applied
      )

      return {
        filePath: file.filePath,
        status:
          remaining.length === 0 ? ("clean" as const) : ("conflict" as const),
        content: resolvedContent,
        ...(applied.length > 0 ? { rerereApplied: applied } : {}),
      }
    })
  )

  return {
    fileResults,
    hasConflicts: fileResults.some((result) => result.status === "conflict"),
  }
}

export async function forcePushResolvedToPRBranch({
  resolvedFiles,
  prBranchName,
  latestMainSha,
  commitMessage,
  authorName,
  authorEmail,
  token,
}: ForcePushInput): Promise<{ newSha: string }> {
  reviewLog("forcePushResolvedToPRBranch", {
    status: "start",
    prBranchName,
    fileCount: resolvedFiles.length,
    latestMainSha: summarizeSha(latestMainSha),
  })
  const octokit = getOctokit(token)
  reviewLog("forcePushResolvedToPRBranch", {
    status: "github-api-before",
    operation: "git.getCommit",
    prBranchName,
    commitSha: summarizeSha(latestMainSha),
  })
  const { data: latestMainCommit } = await octokit.git.getCommit({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    commit_sha: latestMainSha,
  })
  reviewLog("forcePushResolvedToPRBranch", {
    status: "github-api-after",
    operation: "git.getCommit",
    treeSha: summarizeSha(latestMainCommit.tree.sha),
  })

  const tree = await Promise.all(
    resolvedFiles.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner: ARTICLES_REPO_OWNER,
        repo: ARTICLES_REPO_NAME,
        content: file.content,
        encoding: "utf-8",
      })

      return {
        path: file.filePath,
        mode: GIT_BLOB_MODE,
        type: "blob" as const,
        sha: blob.sha,
      }
    })
  )

  reviewLog("forcePushResolvedToPRBranch", {
    status: "github-api-before",
    operation: "git.createTree",
    prBranchName,
    entryCount: tree.length,
  })
  const { data: createdTree } = await octokit.git.createTree({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    base_tree: latestMainCommit.tree.sha,
    tree,
  })
  reviewLog("forcePushResolvedToPRBranch", {
    status: "github-api-after",
    operation: "git.createTree",
    treeSha: summarizeSha(createdTree.sha),
  })

  reviewLog("forcePushResolvedToPRBranch", {
    status: "github-api-before",
    operation: "git.createCommit",
    prBranchName,
    parentSha: summarizeSha(latestMainSha),
    commitMessage: commitMessage || "docs: apply resolved review files",
  })
  const { data: newCommit } = await octokit.git.createCommit({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    message: commitMessage || "docs: apply resolved review files",
    tree: createdTree.sha,
    parents: [latestMainSha],
    ...(authorName && authorEmail
      ? { author: { name: authorName, email: authorEmail } }
      : {}),
  })
  reviewLog("forcePushResolvedToPRBranch", {
    status: "github-api-after",
    operation: "git.createCommit",
    newCommitSha: summarizeSha(newCommit.sha),
  })

  reviewLog("forcePushResolvedToPRBranch", {
    status: "github-api-before",
    operation: "git.updateRef",
    prBranchName,
    newCommitSha: summarizeSha(newCommit.sha),
  })
  await octokit.git.updateRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `heads/${prBranchName}`,
    sha: newCommit.sha,
    force: true,
  })
  reviewLog("forcePushResolvedToPRBranch", {
    status: "github-api-after",
    operation: "git.updateRef",
    prBranchName,
    newCommitSha: summarizeSha(newCommit.sha),
  })

  reviewLog("forcePushResolvedToPRBranch", {
    status: "complete",
    prBranchName,
    newSha: summarizeSha(newCommit.sha),
  })

  return { newSha: newCommit.sha }
}

export async function resolveDraftSyncConflict({
  activeFileId,
  branchName,
  title,
  files,
  syncedMainSha,
  authorName,
  authorEmail,
  token,
}: DraftResolutionInput) {
  const MAX_RETRIES = 3
  const normalizedFiles = normalizeDraftFileCollection({
    activeFileId,
    files,
  })

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const latestMainSha = await getMainBranchHeadSha(token)
    let nextStatus: DraftSyncStatus = "IN_REVIEW"
    const nextFiles: DraftFileRecord[] = []

    for (const file of normalizedFiles.files) {
      const resolvedFilePath = await resolveArticleFilePath(
        file.filePath,
        [latestMainSha],
        token
      )
      let nextFile: DraftFileRecord = {
        ...file,
        conflictContent: undefined,
        filePath: resolvedFilePath,
      }

      if (syncedMainSha && syncedMainSha !== latestMainSha) {
        const previousMainSnapshot = await getFileSnapshot(
          resolvedFilePath,
          syncedMainSha,
          token
        )
        const latestMainSnapshot = await getFileSnapshot(
          resolvedFilePath,
          latestMainSha,
          token
        )
        const mergeResult = mergeArticleContent({
          baseContent: previousMainSnapshot?.content ?? "",
          draftContent: file.content,
          latestMainContent: latestMainSnapshot?.content ?? "",
        })

        nextFile = {
          ...nextFile,
          content: mergeResult.conflict ? file.content : mergeResult.content,
          ...(mergeResult.conflict
            ? { conflictContent: mergeResult.content }
            : {}),
        }

        if (mergeResult.conflict) {
          nextStatus = "SYNC_CONFLICT"
        }
      }

      nextFiles.push(nextFile)
    }

    const resolvedFiles = normalizeDraftFileCollection({
      activeFileId: normalizedFiles.activeFileId,
      files: nextFiles,
    })
    const duplicateResolvedPaths = getDuplicateDraftFilePaths(
      resolvedFiles.files
    )
    if (duplicateResolvedPaths.length > 0) {
      throw new Error(
        `Duplicate resolved file paths are not allowed: ${duplicateResolvedPaths.join(", ")}`
      )
    }

    if (nextStatus === "IN_REVIEW") {
      for (const [index, file] of resolvedFiles.files.entries()) {
        await upsertFileOnBranch({
          authorEmail,
          authorName,
          branchName,
          content: file.content,
          filePath: file.filePath,
          message:
            index === 0
              ? `docs: resolve sync conflict for ${title}`
              : `docs: update ${file.filePath} after conflict resolution`,
          token,
        })
      }
    }

    const verifiedMainSha = await getMainBranchHeadSha(token)
    if (verifiedMainSha === latestMainSha) {
      const primaryFile = getActiveDraftFile(resolvedFiles)
      return {
        activeFileId: resolvedFiles.activeFileId,
        content: primaryFile.content,
        conflictContent: primaryFile.conflictContent || null,
        filePath: primaryFile.filePath,
        files: resolvedFiles.files,
        status: nextStatus,
        syncedMainSha: latestMainSha,
      }
    }

    if (attempt < MAX_RETRIES - 1) {
      await sleep(2 ** attempt * 100)
    }
  }

  throw new Error("Max retries exceeded: main branch is too active")
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function mergeArticleContent({
  baseContent,
  draftContent,
  latestMainContent,
}: {
  baseContent: string
  draftContent: string
  latestMainContent: string
}) {
  const { mergeDiff3 } = require("node-diff3")
  const result = mergeDiff3(
    splitLines(draftContent),
    splitLines(baseContent),
    splitLines(latestMainContent),
    {
      label: {
        a: "draft",
        o: "base",
        b: "main",
      },
    }
  )

  return {
    conflict: result.conflict,
    content: joinLines(result.result),
  }
}

function splitLines(content: string) {
  if (!content) {
    return [] as string[]
  }

  return content.replace(/\r\n/g, "\n").split("\n")
}

function joinLines(lines: string[]) {
  return lines.join("\n")
}

interface FileSnapshot {
  content: string
  sha?: string
}

async function getFileSnapshot(filePath: string, ref: string, token?: string) {
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
    } satisfies FileSnapshot
  } catch {
    return null
  }
}
