import {
  getGithubRateLimitResetMs,
  isGithubRateLimitErrorForCache,
} from "@/lib/github/rate-limit"
import { getGithubErrorStatus } from "@/lib/github/errors"
import { executeWithRetry } from "@/lib/github/retry-fetch"
import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"

const IGNORED_DIRS = new Set([
  "img",
  "oldimg",
  "image",
  "images",
  "source",
  "asset",
  "exampleworld",
  "desynchronized",
  ".github",
  "_scripts",
])

const IGNORED_ROOT_FILES = new Set([
  "readme.md",
  "contributors.md",
  "_sidebar.md",
  "desynchronized.md",
])

let rateLimitedUntilMs = 0

function isCurrentlyRateLimited() {
  return Date.now() < rateLimitedUntilMs
}

function recordRateLimitError(error: unknown) {
  if (!isGithubRateLimitErrorForCache(error)) return

  const resetMs = getGithubRateLimitResetMs(error)
  rateLimitedUntilMs = resetMs ?? Date.now() + 60_000
}

export interface ArticleTreeNode {
  id: string
  title: string
  slug: string
  isFolder: boolean
  introTitle?: string
  isAdvanced?: boolean
  parentId: string | null
  children: ArticleTreeNode[]
}

export async function getRepoContentTree(): Promise<ArticleTreeNode[]> {
  if (isCurrentlyRateLimited()) {
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
    recordRateLimitError(error)
    return []
  }

  const nodeMap = new Map<string, ArticleTreeNode>()

  for (const item of treeData.tree) {
    if (!item.path) continue

    const parts = item.path.split("/")
    const name = parts[parts.length - 1]
    const parentPath = parts.slice(0, -1).join("/")

    if (parts.slice(0, -1).some((p) => IGNORED_DIRS.has(p.toLowerCase()))) {
      continue
    }

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

  const roots: ArticleTreeNode[] = []

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

  function sortNodes(nodes: ArticleTreeNode[]) {
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
  filePath: string,
  retries = 3
): Promise<string | null> {
  if (isCurrentlyRateLimited()) {
    return null
  }

  const octokit = getOctokit(process.env.GITHUB_ARTICLES_WRITE_PAT, true)

  return executeWithRetry<string | null>({
    retries,
    operation: async () => {
      const { data } = await octokit.repos.getContent({
        owner: ARTICLES_REPO_OWNER,
        repo: ARTICLES_REPO_NAME,
        path: filePath,
      })

      if (!Array.isArray(data) && data.type === "file") {
        return Buffer.from(data.content, "base64").toString("utf-8")
      }

      return null
    },
    onError: (error, attempt, totalRetries) => {
      const status = getGithubErrorStatus(error)
      recordRateLimitError(error)

      if (status === 404) {
        return { type: "return", value: null }
      }

      if (attempt === totalRetries - 1) {
        console.error(
          "[github-pr] Failed to fetch %s after %d attempts:",
          filePath,
          totalRetries,
          error
        )
        return { type: "return", value: null }
      }

      return { type: "retry" }
    },
  })
}

export async function getRepoFileBuffer(
  filePath: string,
  retries = 3
): Promise<Buffer | null> {
  if (isCurrentlyRateLimited()) {
    return null
  }

  const octokit = getOctokit(process.env.GITHUB_ARTICLES_WRITE_PAT, true)

  return executeWithRetry<Buffer | null>({
    retries,
    operation: async () => {
      const { data } = await octokit.repos.getContent({
        owner: ARTICLES_REPO_OWNER,
        repo: ARTICLES_REPO_NAME,
        path: filePath,
      })

      if (!Array.isArray(data) && data.type === "file") {
        return Buffer.from(data.content, "base64")
      }

      return null
    },
    onError: (error, attempt, totalRetries) => {
      const status = getGithubErrorStatus(error)
      recordRateLimitError(error)

      if (status === 404) {
        return { type: "return", value: null }
      }

      if (attempt === totalRetries - 1) {
        console.error(
          "[github-pr] Failed to fetch buffer %s after %d attempts:",
          filePath,
          totalRetries,
          error
        )
        return { type: "return", value: null }
      }

      return { type: "retry" }
    },
  })
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
