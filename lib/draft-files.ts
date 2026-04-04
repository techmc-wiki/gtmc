const DRAFT_BUNDLE_PREFIX = "GTMC_DRAFT_BUNDLE_V1:"

interface DraftBundleFileRecord {
  id?: string
  filePath?: string
  content?: string
}

interface DraftBundleRecord {
  version: 1
  activeFileId?: string
  files: DraftBundleFileRecord[]
}

export interface DraftFileRecord {
  id: string
  filePath: string
  content: string
  conflictContent?: string | null
}

export interface DraftFileCollection {
  activeFileId: string
  files: DraftFileRecord[]
}

interface DraftFileCollectionInput {
  activeFileId?: string
  files?: Array<Partial<DraftFileRecord>>
}

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

export function normalizeDraftFilePath(filePath: string) {
  return filePath.trim().replace(/\\/g, "/").replace(/^\/+/, "")
}

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

  return {
    activeFileId,
    files: dedupedFiles,
  }
}

export function getActiveDraftFile(collection: DraftFileCollection) {
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

export function decodeStoredDraftFiles({
  content,
  conflictContent,
  filePath,
}: {
  content: string
  conflictContent?: string | null
  filePath?: string | null
}) {
  const contentBundle = parseStoredBundle(content)
  const conflictBundle = parseStoredBundle(conflictContent)

  if (!contentBundle) {
    const legacyFile = createDraftFile({
      content,
      conflictContent: conflictContent ?? undefined,
      filePath: filePath || "",
    })

    return {
      activeFileId: legacyFile.id,
      files: [legacyFile],
    } satisfies DraftFileCollection
  }

  const contentFiles = normalizeDraftFileCollection({
    activeFileId: contentBundle.activeFileId,
    files: contentBundle.files.map((storedFile) => ({
      id: storedFile.id,
      filePath: storedFile.filePath || "",
      content: storedFile.content || "",
    })),
  })

  if (!conflictBundle) {
    return contentFiles
  }

  const conflictMap = new Map<string, string>()

  for (const conflictFile of conflictBundle.files) {
    const conflictValue = conflictFile.content ?? ""
    if (conflictFile.id) {
      conflictMap.set(`id:${conflictFile.id}`, conflictValue)
    }

    const normalizedPath = normalizeComparablePath(conflictFile.filePath)
    if (normalizedPath) {
      conflictMap.set(`path:${normalizedPath}`, conflictValue)
    }
  }

  return {
    activeFileId: contentFiles.activeFileId,
    files: contentFiles.files.map((file) => {
      const conflictValue =
        conflictMap.get(`id:${file.id}`) ??
        conflictMap.get(`path:${normalizeComparablePath(file.filePath)}`)

      if (conflictValue === undefined) {
        return file
      }

      return {
        ...file,
        conflictContent: conflictValue,
      }
    }),
  } satisfies DraftFileCollection
}

export function serializeDraftFilesForStorage(collection: DraftFileCollection) {
  const normalized = normalizeDraftFileCollection(collection)
  const activeFile = getActiveDraftFile(normalized)

  if (normalized.files.length === 1) {
    return {
      content: activeFile.content,
      conflictContent: activeFile.conflictContent ?? null,
      filePath: activeFile.filePath || null,
    }
  }

  const content = serializeStoredBundle({
    version: 1,
    activeFileId: normalized.activeFileId,
    files: normalized.files.map((file) => ({
      id: file.id,
      filePath: file.filePath,
      content: file.content,
    })),
  })

  const conflictFiles = normalized.files
    .filter(
      (file) =>
        file.conflictContent !== undefined && file.conflictContent !== null
    )
    .map((file) => ({
      id: file.id,
      filePath: file.filePath,
      content: file.conflictContent ?? "",
    }))

  return {
    content,
    conflictContent:
      conflictFiles.length > 0
        ? serializeStoredBundle({
            version: 1,
            activeFileId: normalized.activeFileId,
            files: conflictFiles,
          })
        : null,
    filePath: activeFile.filePath || null,
  }
}

export function serializeDraftFilesPayload(collection: DraftFileCollection) {
  const normalized = normalizeDraftFileCollection(collection)

  return JSON.stringify({
    activeFileId: normalized.activeFileId,
    files: normalized.files.map((file) => ({
      id: file.id,
      filePath: file.filePath,
      content: file.content,
      ...(file.conflictContent !== undefined
        ? { conflictContent: file.conflictContent }
        : {}),
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
      files?: Array<Partial<DraftFileRecord>>
    }

    if (!Array.isArray(parsed.files)) {
      return null
    }

    return normalizeDraftFileCollection({
      activeFileId: parsed.activeFileId,
      files: parsed.files,
    })
  } catch {
    return null
  }
}

function createDraftFileId(filePath?: string) {
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

function normalizeComparablePath(filePath: string | undefined) {
  return normalizeDraftFilePath(filePath || "").toLowerCase()
}

function resolveActiveFileId(
  activeFileId: string | undefined,
  files: DraftFileRecord[]
) {
  return files.find((file) => file.id === activeFileId)?.id || files[0].id
}

function parseStoredBundle(raw: string | null | undefined) {
  if (!raw || !raw.startsWith(DRAFT_BUNDLE_PREFIX)) {
    return null
  }

  try {
    const parsed = JSON.parse(
      raw.slice(DRAFT_BUNDLE_PREFIX.length)
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
  return `${DRAFT_BUNDLE_PREFIX}${JSON.stringify(bundle)}`
}
