import { getArticleFileContent } from "@/lib/articles/branch"
import {
  normalizeDraftFileCollection,
  type DraftFileCollection,
} from "@/lib/drafts/files"
import {
  parseConflictBlocks,
  SIMPLE_CONFLICT_BLOCK_RE,
  storeRerere,
} from "@/lib/review/rerere"
import { hasSimpleConflictMarkers } from "@/lib/review/action-utils"

type ConflictSection =
  | { type: "ok"; content: string }
  | { type: "conflict"; blockIndex: number }

function parseConflictSections(content: string): ConflictSection[] {
  const regex = new RegExp(SIMPLE_CONFLICT_BLOCK_RE.source, "g")
  const sections: ConflictSection[] = []
  let lastIndex = 0
  let blockIndex = 0
  let match = regex.exec(content)

  while (match !== null) {
    if (match.index > lastIndex) {
      sections.push({
        type: "ok",
        content: content.slice(lastIndex, match.index),
      })
    }

    sections.push({ type: "conflict", blockIndex })
    blockIndex += 1
    lastIndex = regex.lastIndex
    match = regex.exec(content)
  }

  if (lastIndex < content.length) {
    sections.push({ type: "ok", content: content.slice(lastIndex) })
  }

  return sections
}

export function extractResolvedBlockResolutions(input: {
  originalConflictContent: string
  resolvedContent: string
  filePath: string
  baseContent: string
}) {
  const blocks = parseConflictBlocks(
    input.originalConflictContent,
    input.filePath,
    input.baseContent
  )
  const sections = parseConflictSections(input.originalConflictContent)
  const resolutions: Array<{
    block: (typeof blocks)[number]
    resolution: string
  }> = []
  let cursor = 0

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]

    if (section?.type === "ok") {
      if (!section.content) {
        continue
      }

      const index = input.resolvedContent.indexOf(section.content, cursor)
      if (index === -1) {
        return []
      }

      cursor = index + section.content.length
      continue
    }

    if (!section || section.type !== "conflict") {
      continue
    }

    const nextOk = sections
      .slice(i + 1)
      .find(
        (candidate): candidate is Extract<ConflictSection, { type: "ok" }> =>
          candidate.type === "ok" && candidate.content.length > 0
      )
    const endIndex = nextOk
      ? input.resolvedContent.indexOf(nextOk.content, cursor)
      : input.resolvedContent.length

    if (endIndex === -1) {
      return []
    }

    const block = blocks[section.blockIndex]
    if (!block) {
      continue
    }

    resolutions.push({
      block,
      resolution: input.resolvedContent.slice(cursor, endIndex),
    })
    cursor = endIndex
  }

  return resolutions
}

export async function recordResolvedRerereEntries(input: {
  token?: string
  storedFiles: DraftFileCollection["files"]
  resolvedFiles: DraftFileCollection["files"]
  baseRef?: string | null
}) {
  if (!input.baseRef) {
    return
  }

  const resolvedById = new Map(
    input.resolvedFiles.map((file) => [file.id, file])
  )

  for (const storedFile of input.storedFiles) {
    const originalConflictContent = storedFile.conflictContent
    const resolvedFile = resolvedById.get(storedFile.id)

    if (
      !originalConflictContent ||
      !resolvedFile ||
      hasSimpleConflictMarkers(resolvedFile.content)
    ) {
      continue
    }

    // eslint-disable-next-line no-await-in-loop -- sequential: GitHub API rate limiting, each file processed independently with early-skip
    const baseContent = await getArticleFileContent(
      storedFile.filePath,
      input.baseRef,
      input.token
    )
    const resolutions = extractResolvedBlockResolutions({
      originalConflictContent,
      resolvedContent: resolvedFile.content,
      filePath: storedFile.filePath,
      baseContent,
    })

    // eslint-disable-next-line no-await-in-loop -- sequential: DB writes per file must complete before next file's conflict resolution
    await Promise.all(
      resolutions.map(({ block, resolution }) =>
        storeRerere(
          block.filePath,
          block.base,
          block.ours,
          block.theirs,
          resolution
        )
      )
    )
  }
}

export function focusDraftFileByPath(
  draftFiles: DraftFileCollection,
  filePath?: string | null
) {
  if (!filePath) {
    return draftFiles
  }

  const targetFile = draftFiles.files.find((file) => file.filePath === filePath)

  if (!targetFile) {
    return draftFiles
  }

  return normalizeDraftFileCollection({
    activeFileId: targetFile.id,
    folders: draftFiles.folders || [],
    files: draftFiles.files,
  })
}

export function getFirstConflictedFilePath(
  files: DraftFileCollection["files"]
) {
  return (
    files.find(
      (file) =>
        file.conflictContent !== undefined && file.conflictContent !== null
    )?.filePath ?? null
  )
}

export function buildDraftSnapshot(draftFiles: DraftFileCollection) {
  return {
    activeFileId: draftFiles.activeFileId,
    files: draftFiles.files.map((file) => ({
      id: file.id,
      filePath: file.filePath,
      content: file.content,
      conflictContent: file.conflictContent ?? null,
    })),
  }
}
