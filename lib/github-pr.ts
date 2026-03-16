import { Octokit } from "@octokit/rest"

const owner = process.env.GITHUB_REPO_OWNER || "gtmc-dev"
const repo = process.env.GITHUB_REPO_NAME || "Articles"

export const getOctokit = (token?: string) => {
  return new Octokit({ auth: token || process.env.GITHUB_TOKEN })
}

export async function createPR({
  title,
  content,
  filePath,
  authorName,
  authorEmail,
  token
}: {
  title: string
  content: string
  filePath: string
  authorName: string
  authorEmail: string
  token?: string
}) {
  const octokit = getOctokit(token)
  
  // 1. Get default branch sha
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: "heads/main",
  })
  const baseSha = ref.object.sha
  
  // 2. Create new branch
  const branchName = `submission-${Date.now()}`
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  })
  
  // 3. Create or update file
  let sha: string | undefined
  try {
    const { data: file } = await octokit.repos.getContent({
      owner, repo, path: filePath, ref: branchName
    })
    if (!Array.isArray(file) && file.type === "file") {
      sha = file.sha
    }
  } catch {}

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `docs: ${title}`,
    content: Buffer.from(content).toString("base64"),
    branch: branchName,
    sha,
    author: { name: authorName, email: authorEmail }
  })
  
  // 4. Create PR
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title,
    head: branchName,
    base: "main",
    body: `由 ${authorName} 提交审核。`
  })
  
  return pr.number
}

export async function getOpenPRs(token?: string) {
  const octokit = getOctokit(token)
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: "open"
  })
  return data
}

export async function getPR(prNumber: number, token?: string) {
  const octokit = getOctokit(token)
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber
  })
  return data
}

export async function getPRFiles(prNumber: number, token?: string) {
  const octokit = getOctokit(token)
  const { data } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber
  })
  return data
}

export async function resolveConflictAndMerge(
  prNumber: number,
  filePath: string,
  resolvedContent: string,
  token?: string
) {
  const octokit = getOctokit(token)
  const pr = await getPR(prNumber, token)
  const branchName = pr.head.ref

  // 1. Get current file sha on the PR branch
  let sha: string | undefined
  try {
    const { data: file } = await octokit.repos.getContent({
      owner, repo, path: filePath, ref: branchName
    })
    if (!Array.isArray(file) && file.type === "file") {
      sha = file.sha
    }
  } catch {}

  // 2. Commit the resolved content to the branch
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `Resolve merge conflicts for ${filePath}`,
    content: Buffer.from(resolvedContent).toString("base64"),
    branch: branchName,
    sha
  })

  // 3. Attempt to merge again
  const { data } = await octokit.pulls.merge({
    owner,
    repo,
    pull_number: prNumber
  })
  return data
}

export async function mergePR(prNumber: number, token?: string) {
  const octokit = getOctokit(token)
  const { data } = await octokit.pulls.merge({
    owner,
    repo,
    pull_number: prNumber
  })
  return data
}
