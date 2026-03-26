import fs from "fs"
import path from "path"
import {
  getRepoFileContent,
  getRepoFileBuffer,
  getRepoContentTree,
  type RepoTreeNode,
} from "./github-pr"

const ARTICLES_DIR = path.join(process.cwd(), "articles")
const SUBMODULE_GIT = path.join(ARTICLES_DIR, ".git")

export function isSubmoduleAvailable(): boolean {
  return fs.existsSync(SUBMODULE_GIT)
}

export async function getArticleContent(
  filePath: string
): Promise<string | null> {
  if (isSubmoduleAvailable()) {
    const localPath = path.join(ARTICLES_DIR, filePath)
    try {
      return fs.readFileSync(localPath, "utf-8")
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[article-loader] File not in submodule: ${filePath}, falling back to API`
        )
      }
    }
  }
  if (process.env.NODE_ENV === "development" && !isSubmoduleAvailable()) {
    console.warn("[article-loader] Submodule not available, using API")
  }
  return await getRepoFileContent(filePath)
}

export async function getArticleTree(): Promise<RepoTreeNode[]> {
  if (isSubmoduleAvailable()) {
    try {
      return buildLocalTree(ARTICLES_DIR)
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[article-loader] Failed to build local tree, falling back to API"
        )
      }
    }
  }
  if (process.env.NODE_ENV === "development" && !isSubmoduleAvailable()) {
    console.warn("[article-loader] Submodule not available, using API for tree")
  }
  return await getRepoContentTree()
}

function buildLocalTree(dir: string, parentPath = ""): RepoTreeNode[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const nodes: RepoTreeNode[] = []

  const IGNORED_DIRS = new Set([
    "img",
    "oldimg",
    "image",
    "images",
    "source",
    "asset",
    "exampleworld",
    "desynchronized",
    ".git",
  ])
  const IGNORED_ROOT_FILES = new Set([
    "readme.md",
    "contributors.md",
    "_sidebar.md",
    "desynchronized.md",
  ])

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name.toLowerCase())) continue
    if (!parentPath && IGNORED_ROOT_FILES.has(entry.name.toLowerCase()))
      continue

    const slug = parentPath ? `${parentPath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      const children = buildLocalTree(path.join(dir, entry.name), slug)
      nodes.push({
        id: `local-${slug}`,
        title: entry.name,
        slug,
        isFolder: true,
        parentId: parentPath ? `local-${parentPath}` : null,
        children,
      })
    } else if (entry.name.endsWith(".md")) {
      const titleName = entry.name.replace(/\.md$/, "")
      const slugWithoutExt = slug.replace(/\.md$/, "")
      nodes.push({
        id: `local-${slugWithoutExt}`,
        title: titleName,
        slug: slugWithoutExt,
        isFolder: false,
        parentId: parentPath ? `local-${parentPath}` : null,
        children: [],
      })
    }
  }

  nodes.sort((a, b) => {
    if (a.isFolder === b.isFolder) return a.title.localeCompare(b.title)
    return a.isFolder ? -1 : 1
  })

  return nodes
}

export async function getArticleBuffer(
  filePath: string
): Promise<Buffer | null> {
  if (isSubmoduleAvailable()) {
    const localPath = path.join(ARTICLES_DIR, filePath)
    try {
      return fs.readFileSync(localPath)
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[article-loader] Buffer not in submodule: ${filePath}, falling back to API`
        )
      }
    }
  }
  return await getRepoFileBuffer(filePath)
}
