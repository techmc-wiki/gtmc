import { Octokit } from "@octokit/rest"

export const ARTICLES_REPO_OWNER =
  process.env.GITHUB_ARTICLES_REPO_OWNER ||
  process.env.GITHUB_REPO_OWNER ||
  "gtmc-dev"
export const ARTICLES_REPO_NAME =
  process.env.GITHUB_ARTICLES_REPO_NAME || "Articles"

const getGitHubReadToken = () =>
  process.env.GITHUB_ARTICLES_READ_PAT ||
  process.env.GITHUB_ARTICLES_WRITE_PAT ||
  process.env.GITHUB_TOKEN ||
  process.env.GITHUB_FEATURES_ISSUES_PAT ||
  process.env.GITHUB_FEATURES_WRITE_PAT

export const getGitHubWriteToken = (fallbackToken?: string | null) =>
  process.env.GITHUB_ARTICLES_WRITE_PAT ||
  process.env.GITHUB_TOKEN ||
  fallbackToken ||
  process.env.GITHUB_FEATURES_WRITE_PAT ||
  process.env.GITHUB_ARTICLES_READ_PAT ||
  process.env.GITHUB_FEATURES_ISSUES_PAT

export const getOctokit = (token?: string) => {
  return new Octokit({ auth: token || getGitHubReadToken() })
}

let rateLimitedUntilMs = 0

function isRateLimited() {
  return Date.now() < rateLimitedUntilMs
}

function getRateLimitResetMs(error: unknown): number | null {
  const resetHeader = (
    error as { response?: { headers?: { [key: string]: string | number } } }
  )?.response?.headers?.["x-ratelimit-reset"]

  if (typeof resetHeader === "number") {
    return resetHeader * 1000
  }

  if (typeof resetHeader === "string") {
    const parsed = Number(resetHeader)
    if (Number.isFinite(parsed)) {
      return parsed * 1000
    }
  }

  return null
}

function rememberRateLimit(error: unknown) {
  const status =
    (error as { status?: number })?.status ||
    (error as { response?: { status?: number } })?.response?.status

  if (status !== 403) return

  const resetMs = getRateLimitResetMs(error)
  rateLimitedUntilMs = resetMs ?? Date.now() + 60_000
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
  const octokit = getOctokit(token)

  // 1. Get default branch sha
  const { data: ref } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: "heads/main",
  })
  const baseSha = ref.object.sha

  // 2. Create new branch
  const branchName = `submission-${Date.now()}`
  await octokit.git.createRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  })

  // 3. Create or update file
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

  // 4. Create PR
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
// ==========================================
// Sidebar / Content tree helpers
// ==========================================

const IGNORED_DIRS = new Set([
  "img",
  "oldimg",
  "image",
  "images",
  "source",
  "asset",
  "exampleworld",
  "desynchronized",
])
const IGNORED_ROOT_FILES = new Set([
  "readme.md",
  "contributors.md",
  "_sidebar.md",
  "desynchronized.md",
])

export interface RepoTreeNode {
  id: string
  title: string
  slug: string
  isFolder: boolean
  parentId: string | null
  children: RepoTreeNode[]
}

export async function getRepoContentTree(): Promise<RepoTreeNode[]> {
  if (isRateLimited()) {
    return []
  }

  const octokit = getOctokit(process.env.GITHUB_ARTICLES_WRITE_PAT)

  let treeData: Awaited<ReturnType<typeof octokit.git.getTree>>["data"]
  try {
    const { data: ref } = await octokit.git.getRef({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      ref: "heads/main",
    })

    const treeResponse = await octokit.git.getTree({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      tree_sha: ref.object.sha,
      recursive: "1",
    })
    treeData = treeResponse.data
  } catch (error) {
    rememberRateLimit(error)
    return []
  }

  const nodeMap = new Map<string, RepoTreeNode>()

  for (const item of treeData.tree) {
    if (!item.path) continue

    const parts = item.path.split("/")
    const name = parts[parts.length - 1]
    const parentPath = parts.slice(0, -1).join("/")

    // Skip if any ancestor directory is in ignored list
    if (parts.slice(0, -1).some((p) => IGNORED_DIRS.has(p.toLowerCase())))
      continue

    if (item.type === "tree") {
      if (IGNORED_DIRS.has(name.toLowerCase())) continue

      nodeMap.set(item.path, {
        id: `gh-${item.path}`,
        title: name,
        slug: item.path,
        isFolder: true,
        parentId: parentPath ? `gh-${parentPath}` : null,
        children: [],
      })
    } else if (item.type === "blob") {
      if (!name.endsWith(".md")) continue
      if (!parentPath && IGNORED_ROOT_FILES.has(name.toLowerCase())) continue

      const titleName = name.replace(/\.md$/, "")
      const slugWithoutExt = item.path.replace(/\.md$/, "")

      nodeMap.set(slugWithoutExt, {
        id: `gh-${slugWithoutExt}`,
        title: titleName,
        slug: slugWithoutExt,
        isFolder: false,
        parentId: parentPath ? `gh-${parentPath}` : null,
        children: [],
      })
    }
  }

  const roots: RepoTreeNode[] = []

  for (const [, node] of nodeMap.entries()) {
    if (node.parentId) {
      const parentKey = node.parentId.replace(/^gh-/, "")
      const parent = nodeMap.get(parentKey)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  function sortNodes(nodes: RepoTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFolder === b.isFolder) return a.title.localeCompare(b.title)
      return a.isFolder ? -1 : 1
    })
    for (const node of nodes) sortNodes(node.children)
  }
  sortNodes(roots)

  return roots
}

export async function getRepoFileContent(
  filePath: string
): Promise<string | null> {
  if (isRateLimited()) {
    return null
  }

  const octokit = getOctokit(process.env.GITHUB_ARTICLES_WRITE_PAT)
  try {
    const { data } = await octokit.repos.getContent({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      path: filePath,
    })
    if (!Array.isArray(data) && data.type === "file") {
      return Buffer.from(data.content, "base64").toString("utf-8")
    }
    return null
  } catch (error) {
    rememberRateLimit(error)
    return null
  }
}

export async function getRepoFileBuffer(
  filePath: string
): Promise<Buffer | null> {
  if (isRateLimited()) {
    return null
  }

  const octokit = getOctokit(process.env.GITHUB_ARTICLES_WRITE_PAT)
  try {
    const { data } = await octokit.repos.getContent({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      path: filePath,
    })
    if (!Array.isArray(data) && data.type === "file") {
      return Buffer.from(data.content, "base64")
    }
    return null
  } catch (error) {
    rememberRateLimit(error)
    return null
  }
}

export async function getRepoTranslations(): Promise<Record<string, string>> {
  const content = await getRepoFileContent("sidebar-translations.json")
  if (content) {
    try {
      return JSON.parse(content.replace(/^\uFEFF/, ""))
    } catch {}
  }
  return {}
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

  // 按照规范自动判断是否符合 rebase 的特殊情况：
  // 1. 分支包含较长且有价值的提交历史（如 5 个以上 commits）
  // 2. 分支包含大量修改，难以合理压缩为单个提交（如 修改了 10 个以上文件，或增删代码超过 500 行）
  const isLongHistory = pr.commits >= 5
  const isLargeModification =
    pr.changed_files >= 10 || pr.additions + pr.deletions >= 500

  if (isLongHistory || isLargeModification) {
    return "rebase"
  }
  return "squash"
}

export async function resolveConflictAndMerge(
  prNumber: number,
  filePath: string,
  resolvedContent: string,
  token?: string,
  mergeMethod?: "squash" | "rebase"
) {
  const octokit = getOctokit(token)
  const pr = await getPR(prNumber, token)
  const actualMergeMethod =
    mergeMethod || (await determineMergeMethod(prNumber, token))
  const branchName = pr.head.ref
  const prHeadSha = pr.head.sha

  const { data: mainRef } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: "heads/main",
  })
  const mainSha = mainRef.object.sha

  const { data: commitInfo } = await octokit.repos.getCommit({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: prHeadSha,
  })
  const originalAuthor = commitInfo.commit.author
  const originalMessage = commitInfo.commit.message

  const { data: files } = await octokit.pulls.listFiles({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
  })

  type TreeEntry = {
    path?: string
    mode?: "100644" | "100755" | "040000" | "160000" | "120000"
    type?: "blob" | "tree" | "commit"
    sha?: string | null
    content?: string
  }
  const treeEntries: TreeEntry[] = []
  let resolvedFileAdded = false

  for (const f of files) {
    if (f.filename === filePath) {
      resolvedFileAdded = true
      treeEntries.push({
        path: f.filename,
        mode: "100644",
        type: "blob",
        content: resolvedContent,
      })
    } else if (f.status === "removed") {
      treeEntries.push({
        path: f.filename,
        mode: "100644",
        type: "blob",
        sha: null,
      })
    } else {
      treeEntries.push({
        path: f.filename,
        mode: "100644",
        type: "blob",
        sha: f.sha,
      })
    }
  }

  if (!resolvedFileAdded) {
    treeEntries.push({
      path: filePath,
      mode: "100644",
      type: "blob",
      content: resolvedContent,
    })
  }

  const { data: tree } = await octokit.git.createTree({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    base_tree: mainSha,
    tree: treeEntries,
  })

  const { data: newCommit } = await octokit.git.createCommit({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    message: `Resolve merge conflicts for ${filePath}\n\nOriginal message:\n${originalMessage}`,
    tree: tree.sha,
    parents: [mainSha], // rebase parent
    author: {
      name: originalAuthor?.name || "GTMC Bot",
      email: originalAuthor?.email || "bot@gtmc.dev",
      date: originalAuthor?.date,
    },
  })

  await octokit.git.updateRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: `heads/${branchName}`,
    sha: newCommit.sha,
    force: true,
  })

  // 7. Attempt to merge again
  const { data } = await octokit.pulls.merge({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
    merge_method: actualMergeMethod,
  })
  return data
}

export async function mergePR(
  prNumber: number,
  token?: string,
  mergeMethod?: "squash" | "rebase"
) {
  const octokit = getOctokit(token)
  const actualMergeMethod =
    mergeMethod || (await determineMergeMethod(prNumber, token))

  const { data } = await octokit.pulls.merge({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
    merge_method: actualMergeMethod,
  })
  return data
}
