import fs from "fs"
import path from "path"
import {
  getRepoFileContent,
  getRepoFileBuffer,
  getRepoContentTree,
  type RepoTreeNode,
} from "./github-pr"
import { shouldIgnoreDirectory, shouldIgnoreFile } from "./article-ignore"
import { parseFrontMatter } from "./frontmatter-parser"

const ARTICLES_DIR = path.join(process.cwd(), "articles")
const SUBMODULE_GIT = path.join(ARTICLES_DIR, ".git")
const SLUG_MAP_PATH = path.join(process.cwd(), "lib/slug-map.json")

const fileToSlugKey: Record<string, string> = (() => {
  try {
    const raw = fs.readFileSync(SLUG_MAP_PATH, "utf-8")
    const slugMap = JSON.parse(raw) as Record<string, string>
    const inverted: Record<string, string> = {}
    for (const [slugKey, filePath] of Object.entries(slugMap)) {
      inverted[filePath.replace(/\.md$/i, "")] = slugKey
    }
    return inverted
  } catch {
    return {}
  }
})()

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

  for (const entry of entries) {
    if (shouldIgnoreDirectory(entry.name)) continue
    if (!parentPath && shouldIgnoreFile(entry.name, true)) continue

    const entryPath = parentPath ? `${parentPath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      const children = buildLocalTree(path.join(dir, entry.name), entryPath)
      nodes.push({
        id: `local-${entryPath}`,
        title: entry.name,
        slug: entryPath,
        isFolder: true,
        parentId: parentPath ? `local-${parentPath}` : null,
        children,
      })
    } else if (entry.name.endsWith(".md")) {
      const titleName = entry.name.replace(/\.md$/, "")
      const slugWithoutExt = entryPath.replace(/\.md$/, "")
      const content = fs.readFileSync(path.join(dir, entry.name), "utf-8")
      const fm = parseFrontMatter(content)
      const nodeSlug = fileToSlugKey[slugWithoutExt] ?? slugWithoutExt
      const isReadme = entry.name.toLowerCase() === "readme.md"
      const mdNode: RepoTreeNode & {
        index: number
        isAppendix: boolean
        isPreface: boolean
      } = {
        id: `local-${slugWithoutExt}`,
        title: isReadme
          ? fm.introTitle || fm.title || titleName
          : fm.title || titleName,
        slug: nodeSlug,
        isFolder: false,
        index: fm.index,
        isAppendix: isAppendixPath(slugWithoutExt),
        isPreface: nodeSlug === "preface",
        parentId: parentPath ? `local-${parentPath}` : null,
        children: [],
      }
      nodes.push(mdNode)
    }
  }

  nodes.sort((a, b) => {
    if (a.isFolder === b.isFolder) return a.title.localeCompare(b.title)
    return a.isFolder ? -1 : 1
  })

  return nodes
}

function isAppendixPath(relativePath: string): boolean {
  const normalizedPath = relativePath.replace(/\\/g, "/")
  const pathSegments = normalizedPath.split("/")
  return pathSegments.some(
    (segment) =>
      segment.toLowerCase().includes("appendix") || segment.includes("附录")
  )
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
