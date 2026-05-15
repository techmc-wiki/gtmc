import { mergeDiff3 } from "node-diff3"

import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import {
  analyzeRebaseNeed,
  analyzeRebaseNeedMultiFile,
} from "@/lib/article-rebase"
import type { RebaseAnalysis } from "@/lib/article-rebase"
import {
  getActiveDraftFile,
  getDuplicateDraftFilePaths,
  normalizeDraftFileCollection,
  type DraftFileRecord,
} from "@/lib/draft-files"
import type { ConflictBlock } from "@/types/rebase"
import {
  applyAutoAppliedResolutions,
  autoApplyRerere,
  parseConflictBlocks,
} from "@/lib/rerere"
import { GIT_BLOB_MODE } from "@/lib/github/constants"
import { getMergeLibrary } from "@/lib/merge-strategy"
import { reviewLog, reviewError, summarizeSha } from "@/lib/review/logging"

const MAIN_BRANCH = "main"

type DraftSyncStatus = "IN_REVIEW" | "SYNC_CONFLICT"

interface FileSnapshot {
  content: string
  sha?: string
}

export type BranchFileEntry = {
  path: string
  content: string | Buffer
  encoding?: "utf-8" | "base64"
}

interface DraftSubmissionInput {
  activeFileId?: string
  draftId: string
  title: string
  files: DraftFileRecord[]
  imageEntries?: BranchFileEntry[]
  baseMainSha: string
  authorName: string
  authorEmail: string
  token?: string
}

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

export interface DraftSyncResult {
  activeFileId: string
  branchName: string
  content: string
  conflictContent: string | null
  filePath: string
  files: DraftFileRecord[]
  prNumber: number
  prUrl: string
  status: DraftSyncStatus
  syncedMainSha: string
  rebaseAnalysis?: RebaseAnalysis
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

export async function getMainBranchHeadSha(token?: string) {
  reviewLog("getMainBranchHeadSha", { status: "start" })
  const octokit = getOctokit(token)
  reviewLog("getMainBranchHeadSha", {
    status: "github-api-before",
    operation: "git.getRef",
    ref: `heads/${MAIN_BRANCH}`,
  })
  const { data } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `heads/${MAIN_BRANCH}`,
  })

  reviewLog("getMainBranchHeadSha", {
    status: "complete",
    sha: summarizeSha(data.object.sha),
  })

  return data.object.sha
}

export async function getArticleFileContent(
  filePath: string,
  ref: string,
  token?: string
) {
  return (await getFileSnapshot(filePath, ref, token))?.content ?? ""
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

export async function resolveArticleFilePath(
  filePath: string,
  refs: string[],
  token?: string
) {
  const normalizedPath = filePath.replace(/^\/+/, "")
  const withoutExtension = normalizedPath.replace(/\.md$/i, "")
  const candidates = normalizedPath.endsWith(".md")
    ? [normalizedPath, withoutExtension, `${withoutExtension}/README.md`]
    : [
        normalizedPath,
        `${withoutExtension}.md`,
        `${withoutExtension}/README.md`,
      ]

  for (const ref of refs) {
    for (const candidate of candidates) {
      const snapshot = await getFileSnapshot(candidate, ref, token)
      if (snapshot) {
        return candidate
      }
    }
  }

  return normalizedPath.endsWith(".md")
    ? normalizedPath
    : `${withoutExtension}.md`
}

export async function openDraftPullRequest({
  activeFileId,
  draftId,
  title,
  files,
  imageEntries,
  baseMainSha,
  authorName,
  authorEmail,
  token,
}: DraftSubmissionInput): Promise<DraftSyncResult> {
  const octokit = getOctokit(token)
  const latestMainSha = await getMainBranchHeadSha(token)
  const resolvedDraftFiles = await Promise.all(
    files.map(async (file) => ({
      ...file,
      filePath: await resolveArticleFilePath(
        file.filePath,
        [baseMainSha, latestMainSha],
        token
      ),
    }))
  )
  const normalizedFiles = normalizeDraftFileCollection({
    activeFileId,
    files: resolvedDraftFiles,
  })
  const duplicateResolvedPaths = getDuplicateDraftFilePaths(
    normalizedFiles.files
  )
  if (duplicateResolvedPaths.length > 0) {
    throw new Error(
      `Duplicate resolved file paths are not allowed: ${duplicateResolvedPaths.join(", ")}`
    )
  }
  const branchName = buildBranchName(draftId)

  await octokit.git.createRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: baseMainSha,
  })

  for (const [index, file] of normalizedFiles.files.entries()) {
    await upsertFileOnBranch({
      authorEmail,
      authorName,
      branchName,
      content: file.content,
      filePath: file.filePath,
      message: index === 0 ? `docs: ${title}` : `docs: update ${file.filePath}`,
      token,
    })
  }

  if (imageEntries && imageEntries.length > 0) {
    await upsertFilesOnBranch(token as string, imageEntries, branchName)
  }

  const { data: pr } = await octokit.pulls.create({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    title,
    head: branchName,
    base: MAIN_BRANCH,
    body: `由 ${authorName} 提交审核。`,
  })

  const primaryFile = getActiveDraftFile(normalizedFiles)

  if (latestMainSha === baseMainSha) {
    return {
      activeFileId: normalizedFiles.activeFileId,
      branchName,
      content: primaryFile.content,
      conflictContent: null,
      filePath: primaryFile.filePath,
      files: normalizedFiles.files,
      prNumber: pr.number,
      prUrl: pr.html_url,
      status: "IN_REVIEW",
      syncedMainSha: latestMainSha,
    }
  }

  const rebaseAnalysis =
    normalizedFiles.files.length === 1
      ? await analyzeRebaseNeed({
          filePath: normalizedFiles.files[0].filePath,
          baseMainSha,
          latestMainSha,
          token,
        })
      : await analyzeRebaseNeedMultiFile({
          files: normalizedFiles.files.map((file) => ({
            filePath: file.filePath,
          })),
          baseMainSha,
          latestMainSha,
          token,
        })

  let hasConflict = false
  const mergedFiles: DraftFileRecord[] = []

  for (const file of normalizedFiles.files) {
    const baseSnapshot = await getFileSnapshot(
      file.filePath,
      baseMainSha,
      token
    )
    const latestSnapshot = await getFileSnapshot(
      file.filePath,
      latestMainSha,
      token
    )
    const mergeResult = mergeArticleContent({
      baseContent: baseSnapshot?.content ?? "",
      draftContent: file.content,
      latestMainContent: latestSnapshot?.content ?? "",
    })

    if (mergeResult.conflict) {
      hasConflict = true
      mergedFiles.push({
        ...file,
        conflictContent: mergeResult.content,
      })
      continue
    }

    if (mergeResult.content !== file.content) {
      await upsertFileOnBranch({
        authorEmail,
        authorName,
        branchName,
        content: mergeResult.content,
        filePath: file.filePath,
        message: `docs: sync ${file.filePath} with latest ${MAIN_BRANCH}`,
        token,
      })
    }

    mergedFiles.push({
      ...file,
      content: mergeResult.content,
    })
  }

  const nextFiles = normalizeDraftFileCollection({
    activeFileId: normalizedFiles.activeFileId,
    files: mergedFiles,
  })
  const nextPrimaryFile = getActiveDraftFile(nextFiles)

  return {
    activeFileId: nextFiles.activeFileId,
    branchName,
    content: nextPrimaryFile.content,
    conflictContent: nextPrimaryFile.conflictContent || null,
    filePath: nextPrimaryFile.filePath,
    files: nextFiles.files,
    prNumber: pr.number,
    prUrl: pr.html_url,
    status: hasConflict ? "SYNC_CONFLICT" : "IN_REVIEW",
    syncedMainSha: latestMainSha,
    rebaseAnalysis,
  }
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

function buildBranchName(draftId: string) {
  return `submission-${draftId}-${Date.now()}`.replace(/[^a-zA-Z0-9/_-]/g, "-")
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
  const result = mergeDiff3(
    splitLines(draftContent),
    splitLines(baseContent),
    splitLines(latestMainContent),
    {
      label: {
        a: "draft",
        o: "base",
        b: MAIN_BRANCH,
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
  } catch (error) {
    reviewError("getFileSnapshot", error, {
      filePath,
      ref: summarizeSha(ref),
      status: "github-api-error",
      operation: "repos.getContent",
    })
    return null
  }
}

export async function upsertFileOnBranch({
  authorEmail,
  authorName,
  branchName,
  content,
  filePath,
  message,
  token,
}: {
  authorEmail: string
  authorName: string
  branchName: string
  content: string
  filePath: string
  message: string
  token?: string
}) {
  const octokit = getOctokit(token)
  const snapshot = await getFileSnapshot(filePath, branchName, token)

  await octokit.repos.createOrUpdateFileContents({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    path: filePath,
    message,
    content: Buffer.from(content).toString("base64"),
    branch: branchName,
    sha: snapshot?.sha,
    author: { name: authorName, email: authorEmail },
  })
}

export async function upsertFilesOnBranch(
  token: string,
  entries: BranchFileEntry[],
  branchName: string
): Promise<void> {
  if (entries.length === 0) {
    return
  }

  const octokit = getOctokit(token)
  const { data: refData } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `heads/${branchName}`,
  })
  const latestCommitSha = refData.object.sha

  const { data: commitData } = await octokit.git.getCommit({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    commit_sha: latestCommitSha,
  })
  const currentTreeSha = commitData.tree.sha

  const blobEntries = await Promise.all(
    entries.map(async (entry) => {
      const usesBase64 =
        Buffer.isBuffer(entry.content) || entry.encoding === "base64"
      const blobEncoding: "utf-8" | "base64" = usesBase64 ? "base64" : "utf-8"
      const blobContent = Buffer.isBuffer(entry.content)
        ? entry.content.toString("base64")
        : entry.content

      const { data: blobData } = await octokit.git.createBlob({
        owner: ARTICLES_REPO_OWNER,
        repo: ARTICLES_REPO_NAME,
        content: blobContent,
        encoding: blobEncoding,
      })

      return {
        path: entry.path,
        mode: GIT_BLOB_MODE,
        type: "blob" as const,
        sha: blobData.sha,
      }
    })
  )

  const { data: treeData } = await octokit.git.createTree({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    base_tree: currentTreeSha,
    tree: blobEntries,
  })

  const { data: createdCommit } = await octokit.git.createCommit({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    message: `docs: update ${entries.length} draft file${entries.length === 1 ? "" : "s"}`,
    tree: treeData.sha,
    parents: [latestCommitSha],
  })

  await octokit.git.updateRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `heads/${branchName}`,
    sha: createdCommit.sha,
  })
}
