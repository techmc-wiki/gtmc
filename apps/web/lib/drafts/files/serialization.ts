import type { DraftFileCollection, DraftFileRecord } from "./types"
import { normalizeDraftFileCollection } from "./collection"

export function serializeDraftFilesPayload(collection: DraftFileCollection) {
  const normalized = normalizeDraftFileCollection(collection)

  return JSON.stringify({
    activeFileId: normalized.activeFileId,
    folders: normalized.folders,
    files: normalized.files.map((file) => ({
      id: file.id,
      filePath: file.filePath,
      content: file.content,
    })),
  })
}

export function deserializeDraftFilesPayload(raw: string | null | undefined) {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as {
      activeFileId?: string
      folders?: string[]
      files?: Array<Partial<DraftFileRecord>>
    }

    if (!Array.isArray(parsed.files)) {
      return null
    }

    return normalizeDraftFileCollection(parsed)
  } catch {
    return null
  }
}
