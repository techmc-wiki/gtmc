import { Octokit } from "@octokit/rest"

export const ARTICLES_REPO_OWNER =
  process.env.GITHUB_ARTICLES_REPO_OWNER ||
  process.env.GITHUB_REPO_OWNER ||
  "gtmc-dev"
export const ARTICLES_REPO_NAME =
  process.env.GITHUB_ARTICLES_REPO_NAME || "Articles"

export const getOctokit = (token?: string) => {
  return new Octokit({ auth: token || process.env.GITHUB_ARTICLES_WRITE_PAT })
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
])
const IGNORED_ROOT_FILES = new Set([
  "readme.md",
  "contributors.md",
  "_sidebar.md",
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
  const octokit = getOctokit(process.env.GITHUB_ARTICLES_WRITE_PAT)

  const { data: ref } = await octokit.git.getRef({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    ref: "heads/main",
  })

  const { data: treeData } = await octokit.git.getTree({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    tree_sha: ref.object.sha,
    recursive: "1",
  })

  const nodeMap = new Map<string, RepoTreeNode>()

  for (const item of treeData.tree) {
    if (!item.path) continue

    const parts = item.path.split("/")
    const name = parts[parts.length - 1]
    const parentPath = parts.slice(0, -1).join("/")

    // Skip if any ancestor directory is in ignored list
    if (
      parts
        .slice(0, -1)
        .some((p) => IGNORED_DIRS.has(p.toLowerCase()))
    )
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
      if (!parentPath && IGNORED_ROOT_FILES.has(name.toLowerCase()))
        continue

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
      if (a.isFolder === b.isFolder)
        return a.title.localeCompare(b.title)
      return a.isFolder ? -1 : 1
    })
    for (const node of nodes) sortNodes(node.children)
  }
  sortNodes(roots)

  return roots
}

export async function getRepoFileContent(
  filePath: string,
): Promise<string | null> {
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
  } catch {
    return null
  }
}

export async function getRepoFileBuffer(
  filePath: string,
): Promise<Buffer | null> {
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
  } catch {
    return null
  }
}

export async function getRepoTranslations(): Promise<
  Record<string, string>
> {
  const content = await getRepoFileContent(
    "sidebar-translations.json",
  )
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

export async function resolveConflictAndMerge(
  prNumber: number,
  filePath: string,
  resolvedContent: string,
  token?: string,
) {
  const octokit = getOctokit(token)
  const pr = await getPR(prNumber, token)
  const branchName = pr.head.ref

  // 1. Get current file sha on the PR branch
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

  // 2. Commit the resolved content to the branch
  await octokit.repos.createOrUpdateFileContents({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    path: filePath,
    message: `Resolve merge conflicts for ${filePath}`,
    content: Buffer.from(resolvedContent).toString("base64"),
    branch: branchName,
    sha,
  })

  // 3. Attempt to merge again
  const { data } = await octokit.pulls.merge({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
  })
  return data
}

export async function mergePR(prNumber: number, token?: string) {
  const octokit = getOctokit(token)
  const { data } = await octokit.pulls.merge({
    owner: ARTICLES_REPO_OWNER,
    repo: ARTICLES_REPO_NAME,
    pull_number: prNumber,
  })
  return data
}
