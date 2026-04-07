import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"

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

export async function determineMergeMethod(
  prNumber: number,
  token?: string
): Promise<"squash" | "rebase"> {
  const pr = await getPR(prNumber, token)

  const isLongHistory = pr.commits >= 5
  const isLargeModification =
    pr.changed_files >= 10 || pr.additions + pr.deletions >= 500

  if (isLongHistory || isLargeModification) {
    return "rebase"
  }
  return "squash"
}

export async function mergePR(
  prNumber: number,
  options?: {
    commitBody?: string
    commitTitle?: string
    mergeMethod?: "squash" | "rebase"
  },
  token?: string
) {
  const octokit = getOctokit(token)
  const actualMergeMethod =
    options?.mergeMethod || (await determineMergeMethod(prNumber, token))

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
    ...(options?.commitTitle ? { commit_title: options.commitTitle } : {}),
    ...(options?.commitBody ? { commit_message: options.commitBody } : {}),
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
