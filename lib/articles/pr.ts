import { mergeDiff3 } from "node-diff3"

import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import {
  analyzeRebaseNeed,
  analyzeRebaseNeedMultiFile,
} from "@/lib/articles/rebase"
import type { RebaseAnalysis } from "@/lib/articles/rebase"
import {
  getActiveDraftFile,
  getDuplicateDraftFilePaths,
  normalizeDraftFileCollection,
  type DraftFileRecord,
} from "@/lib/drafts/files"
import {
  getMainBranchHeadSha,
  resolveArticleFilePath,
  upsertFileOnBranch,
  upsertFilesOnBranch,
  type BranchFileEntry,
} from "@/lib/articles/branch"

const MAIN_BRANCH = "main"

type DraftSyncStatus = "IN_REVIEW" | "SYNC_CONFLICT"

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

  // Each commit depends on the previous branch state — must be sequential
  for (const [index, file] of normalizedFiles.files.entries()) {
    await upsertFileOnBranch({ // eslint-disable-line no-await-in-loop
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

  const fileSnapshots = await Promise.all(
    normalizedFiles.files.map(async (file) => {
      const [baseSnapshot, latestSnapshot] = await Promise.all([
        getFileSnapshot(file.filePath, baseMainSha, token),
        getFileSnapshot(file.filePath, latestMainSha, token),
      ])
      return { file, baseSnapshot, latestSnapshot }
    })
  )

  for (const { file, baseSnapshot, latestSnapshot } of fileSnapshots) {
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
      await upsertFileOnBranch({ // eslint-disable-line no-await-in-loop
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

function buildBranchName(draftId: string) {
  return `submission-${draftId}-${Date.now()}`.replaceAll(/[^a-zA-Z0-9/_-]/g, "-")
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

  return content.replaceAll('\r\n', "\n").split("\n")
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
