import { mergeDiff3 } from "node-diff3"

import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github-pr"

const MAIN_BRANCH = "main"

type DraftSyncStatus = "IN_REVIEW" | "SYNC_CONFLICT"

interface FileSnapshot {
  content: string
  sha?: string
}

interface DraftSubmissionInput {
  draftId: string
  title: string
  content: string
  filePath: string
  baseMainSha: string
  authorName: string
  authorEmail: string
  token?: string
}

interface DraftResolutionInput {
  branchName: string
  title: string
  content: string
  filePath: string
  syncedMainSha?: string | null
  authorName: string
  authorEmail: string
  token?: string
}

export interface DraftSyncResult {
  branchName: string
  content: string
  conflictContent: string | null
  filePath: string
  prNumber: number
  prUrl: string
  status: DraftSyncStatus
  syncedMainSha: string
}

export async function getMainBranchHeadSha(token?: string) {
  const octokit = getOctokit(token)
  const { data } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `heads/${MAIN_BRANCH}`,
  })

  return data.object.sha
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
  draftId,
  title,
  content,
  filePath,
  baseMainSha,
  authorName,
  authorEmail,
  token,
}: DraftSubmissionInput): Promise<DraftSyncResult> {
  const octokit = getOctokit(token)
  const latestMainSha = await getMainBranchHeadSha(token)
  const resolvedFilePath = await resolveArticleFilePath(
    filePath,
    [baseMainSha, latestMainSha],
    token
  )
  const branchName = buildBranchName(draftId)

  await octokit.git.createRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: baseMainSha,
  })

  await upsertFileOnBranch({
    authorEmail,
    authorName,
    branchName,
    content,
    filePath: resolvedFilePath,
    message: `docs: ${title}`,
    token,
  })

  const { data: pr } = await octokit.pulls.create({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    title,
    head: branchName,
    base: MAIN_BRANCH,
    body: `由 ${authorName} 提交审核。`,
  })

  if (latestMainSha === baseMainSha) {
    return {
      branchName,
      content,
      conflictContent: null,
      filePath: resolvedFilePath,
      prNumber: pr.number,
      prUrl: pr.html_url,
      status: "IN_REVIEW",
      syncedMainSha: latestMainSha,
    }
  }

  const baseSnapshot = await getFileSnapshot(
    resolvedFilePath,
    baseMainSha,
    token
  )
  const latestSnapshot = await getFileSnapshot(
    resolvedFilePath,
    latestMainSha,
    token
  )
  const mergeResult = mergeArticleContent({
    baseContent: baseSnapshot?.content ?? "",
    draftContent: content,
    latestMainContent: latestSnapshot?.content ?? "",
  })

  if (mergeResult.conflict) {
    return {
      branchName,
      content,
      conflictContent: mergeResult.content,
      filePath: resolvedFilePath,
      prNumber: pr.number,
      prUrl: pr.html_url,
      status: "SYNC_CONFLICT",
      syncedMainSha: latestMainSha,
    }
  }

  if (mergeResult.content !== content) {
    await upsertFileOnBranch({
      authorEmail,
      authorName,
      branchName,
      content: mergeResult.content,
      filePath: resolvedFilePath,
      message: `docs: sync ${title} with latest ${MAIN_BRANCH}`,
      token,
    })
  }

  return {
    branchName,
    content: mergeResult.content,
    conflictContent: null,
    filePath: resolvedFilePath,
    prNumber: pr.number,
    prUrl: pr.html_url,
    status: "IN_REVIEW",
    syncedMainSha: latestMainSha,
  }
}

export async function resolveDraftSyncConflict({
  branchName,
  title,
  content,
  filePath,
  syncedMainSha,
  authorName,
  authorEmail,
  token,
}: DraftResolutionInput) {
  const latestMainSha = await getMainBranchHeadSha(token)
  const resolvedFilePath = await resolveArticleFilePath(
    filePath,
    [latestMainSha],
    token
  )
  let nextContent = content
  let nextConflictContent: string | null = null
  let nextStatus: DraftSyncStatus = "IN_REVIEW"

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
      draftContent: content,
      latestMainContent: latestMainSnapshot?.content ?? "",
    })

    nextContent = mergeResult.content
    if (mergeResult.conflict) {
      nextConflictContent = mergeResult.content
      nextStatus = "SYNC_CONFLICT"
    }
  }

  if (nextStatus === "IN_REVIEW") {
    await upsertFileOnBranch({
      authorEmail,
      authorName,
      branchName,
      content: nextContent,
      filePath: resolvedFilePath,
      message: `docs: resolve sync conflict for ${title}`,
      token,
    })
  }

  return {
    content: nextContent,
    conflictContent: nextConflictContent,
    filePath: resolvedFilePath,
    status: nextStatus,
    syncedMainSha: latestMainSha,
  }
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
  } catch {
    return null
  }
}

async function upsertFileOnBranch({
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
