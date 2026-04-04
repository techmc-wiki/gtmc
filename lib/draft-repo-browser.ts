import {
  getRepoContentTree,
  getRepoFileContent,
} from "@/lib/github-repo-client"

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

export async function getDraftRepoFile(filePath: string) {
  return getRepoFileContent(filePath)
}

function mapRepoTreeNode(node: {
  id: string
  title: string
  slug: string
  isFolder: boolean
  children: Array<{
    id: string
    title: string
    slug: string
    isFolder: boolean
    children: unknown[]
  }>
}): DraftRepoTreeNode {
  const path = node.isFolder ? node.slug : `${node.slug}.md`

  return {
    id: node.id,
    title: node.title,
    path,
    isFolder: node.isFolder,
    children: node.children.map((child) =>
      mapRepoTreeNode(
        child as {
          id: string
          title: string
          slug: string
          isFolder: boolean
          children: Array<{
            id: string
            title: string
            slug: string
            isFolder: boolean
            children: unknown[]
          }>
        }
      )
    ),
  }
}
