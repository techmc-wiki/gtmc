import type { ArticleTreeNode } from "@/lib/articles/article-tree-types"
import { getRepoContentTree } from "@/lib/github"

export interface DraftRepoTreeNode {
  id: string
  title: string
  path: string
  isFolder: boolean
  children: DraftRepoTreeNode[]
}

export async function getDraftRepoTree() {
  const repoTree = await getRepoContentTree()

  return repoTree.map(mapRepoTreeNode)
}

function mapRepoTreeNode(node: ArticleTreeNode): DraftRepoTreeNode {
  const nodePath = node.isFolder ? node.slug : `${node.slug}.md`

  return {
    id: node.id,
    title: node.title,
    path: nodePath,
    isFolder: node.isFolder,
    children: node.children.map(mapRepoTreeNode),
  }
}
