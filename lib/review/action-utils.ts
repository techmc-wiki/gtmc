import { upsertFileOnBranch, upsertFilesOnBranch } from "@/lib/articles/branch"
import {
  normalizeDraftFileCollection,
  type DraftFileCollection,
} from "@/lib/drafts/files"
import { SIMPLE_CONFLICT_BLOCK_RE } from "@/lib/review/rerere"

const SIMPLE_CONFLICT_MARKER_RE = new RegExp(
  SIMPLE_CONFLICT_BLOCK_RE.source,
  "g"
)

export function formatErrorMessage(message: string, error: unknown): string {
  if (error instanceof Error) {
    return `${message}: ${error.message}`
  }
  return message
}

export function hasSimpleConflictMarkers(content: string) {
  SIMPLE_CONFLICT_MARKER_RE.lastIndex = 0
  return SIMPLE_CONFLICT_MARKER_RE.test(content)
}

export function applyRebasedFilesToDraft(
  draftFiles: DraftFileCollection,
  rebasedFiles?: Array<{ filePath: string; content: string }>,
  singleFileFallback?: { filePath: string; content: string },
  conflict?: { filePath?: string; content?: string | null }
) {
  const rebasedFileMap = new Map(
    (rebasedFiles ?? []).map((file) => [file.filePath, file.content])
  )

  return normalizeDraftFileCollection({
    activeFileId: draftFiles.activeFileId,
    folders: draftFiles.folders || [],
    files: draftFiles.files.map((file) => ({
      ...file,
      content:
        rebasedFileMap.get(file.filePath) ??
        (singleFileFallback && file.filePath === singleFileFallback.filePath
          ? singleFileFallback.content
          : file.content),
      conflictContent:
        conflict?.content && file.filePath === conflict.filePath
          ? conflict.content
          : undefined,
    })),
  })
}

export async function persistRebasedBranchFiles(input: {
  authorEmail: string
  authorName: string
  branchName: string
  files: Array<{ filePath: string; content: string }>
  message: string
  token?: string
}) {
  if (input.files.length <= 1) {
    const file = input.files[0]
    if (!file) {
      return
    }

    await upsertFileOnBranch({
      authorEmail: input.authorEmail,
      authorName: input.authorName,
      branchName: input.branchName,
      content: file.content,
      filePath: file.filePath,
      message: input.message,
      token: input.token,
    })
    return
  }

  if (!input.token) {
    throw new Error("GitHub token is required to update multiple files")
  }

  await upsertFilesOnBranch(
    input.token,
    input.files.map((file) => ({
      path: file.filePath,
      content: file.content,
    })),
    input.branchName
  )
}
