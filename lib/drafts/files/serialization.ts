import type {
  DraftFileCollection,
  DraftFileRecord,
  DraftBundleRecord,
  DRAFT_BUNDLE_PREFIX,
} from "./types"
import { normalizeDraftFileCollection } from "./collection"
import { createDraftFile, getActiveDraftFile } from "./file-operations"
import { collectParentFolders } from "./normalization"

const BUNDLE_PREFIX: typeof DRAFT_BUNDLE_PREFIX = "GTMC_DRAFT_BUNDLE_V1:"

export function decodeStoredDraftFiles({
  content,
  filePath,
}: {
  content: string
  filePath?: string | null
}) {
  const contentBundle = parseStoredBundle(content)

  if (!contentBundle) {
    const legacyFile = createDraftFile({
      content,
      filePath: filePath || "",
    })

    return {
      activeFileId: legacyFile.id,
      folders: collectParentFolders([legacyFile.filePath]),
      files: [legacyFile],
    } satisfies DraftFileCollection
  }

  return normalizeDraftFileCollection({
    activeFileId: contentBundle.activeFileId,
    folders: contentBundle.folders || [],
    files: contentBundle.files.map((storedFile) => ({
      id: storedFile.id,
      filePath: storedFile.filePath || "",
      content: storedFile.content || "",
    })),
  })
}

export function serializeDraftFilesForStorage(collection: DraftFileCollection) {
  const normalized = normalizeDraftFileCollection(collection)
  const activeFile = getActiveDraftFile(normalized)

  if (normalized.files.length === 1 && normalized.folders.length === 0) {
    return {
      content: activeFile.content,
      filePath: activeFile.filePath || null,
    }
  }

  const content = serializeStoredBundle({
    version: 1,
    activeFileId: normalized.activeFileId,
    folders: normalized.folders,
    files: normalized.files.map((file) => ({
      id: file.id,
      filePath: file.filePath,
      content: file.content,
    })),
  })

  return {
    content,
    filePath: activeFile.filePath || null,
  }
}

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

    return normalizeDraftFileCollection({
      activeFileId: parsed.activeFileId,
      folders: parsed.folders,
      files: parsed.files,
    })
  } catch {
    return null
  }
}

function parseStoredBundle(raw: string | null | undefined) {
  if (!raw || !raw.startsWith(BUNDLE_PREFIX)) {
    return null
  }

  try {
    const parsed = JSON.parse(
      raw.slice(BUNDLE_PREFIX.length)
    ) as Partial<DraftBundleRecord>

    if (parsed.version !== 1 || !Array.isArray(parsed.files)) {
      return null
    }

    return parsed as DraftBundleRecord
  } catch {
    return null
  }
}

function serializeStoredBundle(bundle: DraftBundleRecord) {
  return `${BUNDLE_PREFIX}${JSON.stringify(bundle)}`
}
