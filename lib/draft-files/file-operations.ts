import type { DraftFileRecord } from "./types"
import { normalizeDraftFilePath, normalizeComparablePath } from "./normalization"

export function createDraftFile(
  overrides: Partial<DraftFileRecord> = {}
): DraftFileRecord {
  const filePath = normalizeDraftFilePath(overrides.filePath || "")

  return {
    id: overrides.id || createDraftFileId(filePath),
    filePath,
    content: overrides.content ?? "",
    ...(overrides.conflictContent !== undefined
      ? { conflictContent: overrides.conflictContent }
      : {}),
  }
}

export function createDraftFileId(filePath?: string) {
  const pathSegment = normalizeDraftFilePath(filePath || "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/\/+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
  const randomSegment =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10)

  return pathSegment
    ? `draft-file-${pathSegment}-${randomSegment}`
    : `draft-file-${randomSegment}`
}

export function getActiveDraftFile(collection: { activeFileId: string; files: DraftFileRecord[] }) {
  return (
    collection.files.find((file) => file.id === collection.activeFileId) ||
    collection.files[0]
  )
}

export function getDuplicateDraftFilePaths(files: DraftFileRecord[]) {
  const duplicates: string[] = []
  const seenPaths = new Set<string>()

  for (const file of files) {
    const normalizedPath = normalizeComparablePath(file.filePath)

    if (!normalizedPath) {
      continue
    }

    if (seenPaths.has(normalizedPath)) {
      if (!duplicates.includes(file.filePath)) {
        duplicates.push(file.filePath)
      }
      continue
    }

    seenPaths.add(normalizedPath)
  }

  return duplicates
}
