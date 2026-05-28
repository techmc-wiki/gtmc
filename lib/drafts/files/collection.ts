import type {
  DraftFileCollection,
  DraftFileCollectionInput,
  DraftFileRecord,
} from "./types"
import { createDraftFile, createDraftFileId } from "./file-operations"
import {
  normalizeDraftFilePath,
  normalizeDraftFolderPath,
  collectParentFolders,
  listFolderAncestors,
} from "./normalization"

export function normalizeDraftFileCollection(
  input: DraftFileCollectionInput | null | undefined
): DraftFileCollection {
  const files = (input?.files || []).map((file) =>
    createDraftFile({
      ...file,
      filePath: normalizeDraftFilePath(file.filePath || ""),
    })
  )

  const dedupedFiles: DraftFileRecord[] = []
  const usedIds = new Set<string>()

  for (const file of files) {
    let nextId = file.id
    while (usedIds.has(nextId)) {
      nextId = createDraftFileId(file.filePath)
    }

    usedIds.add(nextId)
    dedupedFiles.push({ ...file, id: nextId })
  }

  if (dedupedFiles.length === 0) {
    dedupedFiles.push(createDraftFile())
  }

  const activeFileId = resolveActiveFileId(input?.activeFileId, dedupedFiles)
  const folders = dedupeNormalizedFolders(input?.folders || [], dedupedFiles)

  return {
    activeFileId,
    folders,
    files: dedupedFiles,
  }
}

function resolveActiveFileId(
  activeFileId: string | undefined,
  files: DraftFileRecord[]
) {
  return files.find((file) => file.id === activeFileId)?.id || files[0].id
}

function dedupeNormalizedFolders(
  folders: string[],
  files: DraftFileRecord[]
): string[] {
  const normalizedFolders = new Set<string>()

  for (const folder of folders) {
    const normalized = normalizeDraftFolderPath(folder)
    if (!normalized) {
      continue
    }

    for (const ancestor of listFolderAncestors(normalized)) {
      normalizedFolders.add(ancestor)
    }
  }

  for (const folder of collectParentFolders(
    files.map((file) => file.filePath)
  )) {
    normalizedFolders.add(folder)
  }

  return [...normalizedFolders].toSorted((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" })
  )
}
