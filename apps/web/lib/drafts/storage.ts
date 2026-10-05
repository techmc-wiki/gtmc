import { del, get, list, put } from "@vercel/blob"
import { randomUUID } from "node:crypto"
import path from "node:path"
import { getRepoContentTree, getRepoFileContent } from "@/lib/github"
import { draftBlobOptions, draftPath } from "@/lib/drafts/store"

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
  const nodePath = node.isFolder ? node.slug : `${node.slug}.md`

  return {
    id: node.id,
    title: node.title,
    path: nodePath,
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

export function draftAssetPrefix(authorId: string, draftId: string) {
  draftPath(authorId, draftId)
  return `draft-assets/${authorId}/${draftId}/`
}

export async function uploadDraftAsset(
  authorId: string,
  draftId: string,
  filename: string,
  data: Buffer,
  mimeType: string
) {
  const storagePath = `${draftAssetPrefix(authorId, draftId)}${randomUUID()}-${path.posix.basename(filename)}`
  await put(storagePath, data, {
    ...draftBlobOptions(),
    access: "private",
    addRandomSuffix: false,
    contentType: mimeType,
  })
  return { storagePath, url: `/api/${storagePath}` }
}

export async function downloadDraftAsset(storagePath: string) {
  const blob = await get(storagePath, {
    ...draftBlobOptions(),
    access: "private",
    useCache: false,
  })
  if (!blob) throw new Error("Draft asset not found")
  return Buffer.from(await new Response(blob.stream).arrayBuffer())
}

export async function deleteDraftAsset(storagePath: string) {
  await del(storagePath, draftBlobOptions())
}

export async function deleteDraftAssets(authorId: string, draftId: string) {
  let cursor: string | undefined
  do {
    // oxlint-disable-next-line no-await-in-loop -- each page needs the previous cursor
    const page = await list({
      ...draftBlobOptions(),
      prefix: draftAssetPrefix(authorId, draftId),
      cursor,
    })
    if (page.blobs.length) {
      // oxlint-disable-next-line no-await-in-loop -- finish deleting this page before advancing
      await del(
        page.blobs.map((blob) => blob.pathname),
        draftBlobOptions()
      )
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
}
