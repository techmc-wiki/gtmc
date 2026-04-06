import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"

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
  const octokit = getOctokit(token)

  const { data: ref } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: "heads/main",
  })
  const baseSha = ref.object.sha

  const branchName = `submission-${Date.now()}`
  await octokit.git.createRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
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

  const { data: pr } = await octokit.pulls.create({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    title,
    head: branchName,
    base: "main",
    body: `由 ${authorName} 提交审核。`,
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
  const octokit = getOctokit(token)
  const { data } = await octokit.pulls.list({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    state: "open",
  })
  return data
}

export async function getPR(prNumber: number, token?: string) {
  const octokit = getOctokit(token)
  const { data } = await octokit.pulls.get({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
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

  const { data } = await octokit.pulls.merge({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
    merge_method: actualMergeMethod,
    ...(options?.commitTitle ? { commit_title: options.commitTitle } : {}),
    ...(options?.commitBody ? { commit_message: options.commitBody } : {}),
  })

  return data
}
