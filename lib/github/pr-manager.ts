import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import type {
  ReviewMergeMethod,
  ReviewMergeStrategyAnalysis,
} from "@/types/review"

function reviewLog(action: string, details: Record<string, unknown>) {
  console.log(`[review:${action}]`, details)
}

function summarizeSha(sha?: string | null) {
  return sha ? sha.slice(0, 7) : null
}

export async function createPR({
  title,
  content,
  filePath,
  authorName,
  authorEmail,
  token,
}: {
  title: string
  content: string
  filePath: string
  authorName: string
  authorEmail: string
  token?: string
}) {
  reviewLog("createPR", { title, status: "start", filePath })
  const octokit = getOctokit(token)

  reviewLog("createPR", {
    title,
    status: "github-api-before",
    operation: "git.getRef",
    ref: "heads/main",
  })
  const { data: ref } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: "heads/main",
  })
  const baseSha = ref.object.sha
  reviewLog("createPR", {
    title,
    status: "github-api-after",
    operation: "git.getRef",
    baseSha: summarizeSha(baseSha),
  })

  const branchName = `submission-${Date.now()}`
  reviewLog("createPR", {
    title,
    status: "github-api-before",
    operation: "git.createRef",
    branchName,
    baseSha: summarizeSha(baseSha),
  })
  await octokit.git.createRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  })
  reviewLog("createPR", {
    title,
    status: "github-api-after",
    operation: "git.createRef",
    branchName,
  })

  let sha: string | undefined
  try {
    const { data: file } = await octokit.repos.getContent({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      path: filePath,
      ref: branchName,
    })
    if (!Array.isArray(file) && file.type === "file") {
      sha = file.sha
    }
  } catch {}

  reviewLog("createPR", {
    title,
    status: "github-api-before",
    operation: "repos.createOrUpdateFileContents",
    branchName,
    filePath,
  })
  await octokit.repos.createOrUpdateFileContents({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    path: filePath,
    message: `docs: ${title}`,
    content: Buffer.from(content).toString("base64"),
    branch: branchName,
    sha,
    author: { name: authorName, email: authorEmail },
  })
  reviewLog("createPR", {
    title,
    status: "github-api-after",
    operation: "repos.createOrUpdateFileContents",
    branchName,
    filePath,
  })

  reviewLog("createPR", {
    title,
    status: "github-api-before",
    operation: "pulls.create",
    branchName,
  })
  const { data: pr } = await octokit.pulls.create({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    title,
    head: branchName,
    base: "main",
    body: `由 ${authorName} 提交审核。\n\nCo-authored-by: ${authorName} <${authorEmail}>`,
  })

  reviewLog("createPR", {
    title,
    status: "complete",
    prNumber: pr.number,
    branchName,
  })

  return pr.number
}

export async function createDirectFile({
  title,
  content,
  filePath,
  authorName,
  authorEmail,
  token,
}: {
  title: string
  content: string
  filePath: string
  authorName: string
  authorEmail: string
  token?: string
}) {
  const octokit = getOctokit(token)

  let sha: string | undefined
  try {
    const { data: file } = await octokit.repos.getContent({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      path: filePath,
      ref: "main",
    })
    if (!Array.isArray(file) && file.type === "file") {
      sha = file.sha
    }
  } catch {}

  await octokit.repos.createOrUpdateFileContents({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    path: filePath,
    message: `docs: ${title}`,
    content: Buffer.from(content).toString("base64"),
    branch: "main",
    sha,
    author: { name: authorName, email: authorEmail },
  })
}

export async function getOpenPRs(token?: string) {
  reviewLog("getOpenPRs", { status: "start" })
  const octokit = getOctokit(token)
  reviewLog("getOpenPRs", {
    status: "github-api-before",
    operation: "pulls.list",
    state: "open",
  })
  const { data } = await octokit.pulls.list({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    state: "open",
  })
  reviewLog("getOpenPRs", { status: "complete", resultCount: data.length })
  return data
}

export async function getClosedPRs(
  token: string | undefined,
  page: number,
  perPage = 10
) {
  reviewLog("getClosedPRs", { status: "start", page, perPage })
  const octokit = getOctokit(token)
  reviewLog("getClosedPRs", {
    status: "github-api-before",
    operation: "pulls.list",
    state: "closed",
    page,
    perPage,
  })
  const { data } = await octokit.pulls.list({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    state: "closed",
    per_page: perPage,
    page,
    sort: "updated",
    direction: "desc",
  })
  reviewLog("getClosedPRs", {
    status: "complete",
    page,
    perPage,
    resultCount: data.length,
  })
  return data
}

export async function getPR(prNumber: number, token?: string) {
  reviewLog("getPR", { prNumber, status: "start" })
  const octokit = getOctokit(token)
  reviewLog("getPR", {
    prNumber,
    status: "github-api-before",
    operation: "pulls.get",
  })
  const { data } = await octokit.pulls.get({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
  })
  reviewLog("getPR", {
    prNumber,
    status: "complete",
    state: data.state,
    merged: data.merged,
  })
  return data
}

export async function getPRFiles(prNumber: number, token?: string) {
  const octokit = getOctokit(token)
  const { data } = await octokit.pulls.listFiles({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
  })
  return data
}

export function analyzeReviewMergeStrategy(pr: {
  commits: number
  changed_files: number
  additions: number
  deletions: number
}): ReviewMergeStrategyAnalysis {
  const totalChanges = pr.additions + pr.deletions

  if (pr.commits <= 2 && pr.changed_files <= 3 && totalChanges <= 120) {
    return {
      recommendation: "direct",
      availableMethods: ["direct", "squash", "rebase"],
      rationale:
        "Small pull request with short history. Direct landing keeps the original branch commit chain without creating a merge commit.",
    }
  }

  if (pr.commits >= 6 || pr.changed_files >= 10 || totalChanges >= 500) {
    return {
      recommendation: "rebase",
      availableMethods: ["rebase", "squash", "direct"],
      rationale:
        "Large or long-running pull request. Rebase keeps the commit sequence readable while still avoiding merge commits.",
    }
  }

  return {
    recommendation: "squash",
    availableMethods: ["squash", "rebase", "direct"],
    rationale:
      "Medium-sized pull request. Squash keeps main history compact while preserving authorship in the commit body.",
  }
}

export async function determineReviewMergeMethod(
  prNumber: number,
  token?: string
): Promise<ReviewMergeMethod> {
  const pr = await getPR(prNumber, token)
  return analyzeReviewMergeStrategy(pr).recommendation
}

export async function determineMergeMethod(
  prNumber: number,
  token?: string
): Promise<"squash" | "rebase"> {
  const recommended = await determineReviewMergeMethod(prNumber, token)

  if (recommended === "rebase") {
    return "rebase"
  }
  return "squash"
}

async function landPullRequestDirectly(
  prNumber: number,
  token?: string
): Promise<{ merged: boolean; message: string; sha: string | null }> {
  const octokit = getOctokit(token)
  const pr = await getPR(prNumber, token)

  if (pr.base.ref !== "main") {
    throw new Error(
      "Direct landing is only supported for pull requests targeting main"
    )
  }

  reviewLog("landPullRequestDirectly", {
    prNumber,
    status: "start",
    headSha: summarizeSha(pr.head.sha),
  })

  const { data: mainRef } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: "heads/main",
  })

  reviewLog("landPullRequestDirectly", {
    prNumber,
    status: "github-api-before",
    operation: "git.updateRef",
    mainSha: summarizeSha(mainRef.object.sha),
    nextSha: summarizeSha(pr.head.sha),
  })

  await octokit.git.updateRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: "heads/main",
    sha: pr.head.sha,
    force: false,
  })

  reviewLog("landPullRequestDirectly", {
    prNumber,
    status: "complete",
    sha: summarizeSha(pr.head.sha),
  })

  return {
    merged: true,
    message: "Pull request landed directly on main",
    sha: pr.head.sha,
  }
}

export async function mergePR(
  prNumber: number,
  options?: {
    commitBody?: string
    commitTitle?: string
    mergeMethod?: ReviewMergeMethod
  },
  token?: string
) {
  const actualMergeMethod =
    options?.mergeMethod || (await determineReviewMergeMethod(prNumber, token))

  if (actualMergeMethod === "direct") {
    return landPullRequestDirectly(prNumber, token)
  }

  const octokit = getOctokit(token)

  reviewLog("mergePR", {
    prNumber,
    status: "start",
    mergeMethod: actualMergeMethod,
    commitTitleProvided: Boolean(options?.commitTitle),
    commitBodyProvided: Boolean(options?.commitBody),
  })
  reviewLog("mergePR", {
    prNumber,
    status: "github-api-before",
    operation: "pulls.merge",
    mergeMethod: actualMergeMethod,
  })
  const { data } = await octokit.pulls.merge({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
    merge_method: actualMergeMethod,
    ...(actualMergeMethod === "squash" && options?.commitTitle
      ? { commit_title: options.commitTitle }
      : {}),
    ...(actualMergeMethod === "squash" && options?.commitBody
      ? { commit_message: options.commitBody }
      : {}),
  })

  reviewLog("mergePR", {
    prNumber,
    status: "complete",
    mergeMethod: actualMergeMethod,
    merged: data.merged,
    sha: summarizeSha(data.sha),
  })

  return data
}
