import { del, get, list, put } from "@vercel/blob"
import { randomUUID } from "node:crypto"
import path from "node:path"
import { privateBlobOptions } from "@/lib/blob-stores"
import { draftPath } from "@/lib/drafts/store"

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
    ...privateBlobOptions(),
    access: "private",
    addRandomSuffix: false,
    contentType: mimeType,
  })
  return { storagePath, url: `/api/${storagePath}` }
}

export async function downloadDraftAsset(storagePath: string) {
  const blob = await get(storagePath, {
    ...privateBlobOptions(),
    access: "private",
    useCache: false,
  })
  if (!blob) throw new Error("Draft asset not found")
  return Buffer.from(await new Response(blob.stream).arrayBuffer())
}

export async function deleteDraftAsset(storagePath: string) {
  await del(storagePath, privateBlobOptions())
}

export async function deleteDraftAssets(authorId: string, draftId: string) {
  let cursor: string | undefined
  do {
    // oxlint-disable-next-line no-await-in-loop -- each page needs the previous cursor
    const page = await list({
      ...privateBlobOptions(),
      prefix: draftAssetPrefix(authorId, draftId),
      cursor,
    })
    if (page.blobs.length) {
      // oxlint-disable-next-line no-await-in-loop -- finish deleting this page before advancing
      await del(
        page.blobs.map((blob) => blob.pathname),
        privateBlobOptions()
      )
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
}
