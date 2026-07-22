import { shouldSkipArticleFile } from "@/lib/articles/frontmatter-parser"
import { isReservedArticlePath } from "@/lib/articles/path-conventions"
import {
  ARTICLES_REPO_NAME,
  ARTICLES_REPO_OWNER,
  getOctokit,
} from "@/lib/github/articles-repo"
import {
  isGithubSyncRateLimited,
  recordGithubSyncRateLimit,
} from "@/lib/github/sync-rate-limit"

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
  if (isGithubSyncRateLimited()) {
    return []
  }

  const octokit = getOctokit(process.env.GITHUB_ARTICLES_WRITE_PAT)

  try {
    const { data: ref } = await octokit.git.getRef({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      ref: "heads/main",
    })
    const { data: tree } = await octokit.git.getTree({
      owner: ARTICLES_REPO_OWNER,
      repo: ARTICLES_REPO_NAME,
      tree_sha: ref.object.sha,
      recursive: "1",
    })
    const markdownFiles = tree.tree.filter(
      (item) =>
        item.type === "blob" &&
        item.path?.toLowerCase().endsWith(".md") &&
        !isReservedArticlePath(item.path) &&
        item.sha
    )
    const candidates = await Promise.all(
      markdownFiles.map(async (item) => {
        const { data } = await octokit.git.getBlob({
          owner: ARTICLES_REPO_OWNER,
          repo: ARTICLES_REPO_NAME,
          file_sha: item.sha!,
        })
        const content = Buffer.from(data.content, "base64").toString("utf-8")

        return shouldSkipArticleFile(content) ? null : item.path!
      })
    )

    return buildRepoContentTree(
      candidates.filter((path): path is string => path !== null)
    )
  } catch (error) {
    recordGithubSyncRateLimit(error)
    return []
  }
}

function buildRepoContentTree(filePaths: string[]): ArticleTreeNode[] {
  const nodeMap = new Map<string, ArticleTreeNode>()

  for (const filePath of filePaths) {
    const parts = filePath.split("/")
    const fileName = parts.pop()!
    let parentPath = ""

    for (const part of parts) {
      const folderPath = parentPath ? `${parentPath}/${part}` : part
      if (!nodeMap.has(folderPath)) {
        nodeMap.set(folderPath, {
          id: `gh-${folderPath}`,
          title: part,
          slug: folderPath,
          isFolder: true,
          parentId: parentPath ? `gh-${parentPath}` : null,
          children: [],
        })
      }
      parentPath = folderPath
    }

    const slugWithoutExt = filePath.replace(/\.md$/i, "")
    nodeMap.set(slugWithoutExt, {
      id: `gh-${slugWithoutExt}`,
      title: fileName.replace(/\.md$/i, ""),
      slug: slugWithoutExt,
      isFolder: false,
      parentId: parentPath ? `gh-${parentPath}` : null,
      children: [],
    })
  }

  const roots: ArticleTreeNode[] = []
  for (const node of nodeMap.values()) {
    if (!node.parentId) {
      roots.push(node)
      continue
    }

    const parent = nodeMap.get(node.parentId.replace(/^gh-/, ""))
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  sortNodes(roots)
  return roots
}

function sortNodes(nodes: ArticleTreeNode[]) {
  nodes.sort((a, b) => {
    if (a.isFolder === b.isFolder) return a.title.localeCompare(b.title)
    return a.isFolder ? -1 : 1
  })

  for (const node of nodes) sortNodes(node.children)
}
