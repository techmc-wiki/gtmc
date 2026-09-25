"use client"

import { useTranslations } from "next-intl"
import { DraftFileSourceDialog } from "@/components/editor/draft-file-source-dialog"
import type { SourceMode } from "@/components/editor/draft-file-source-dialog"
import { normalizeDraftFilePath } from "@/lib/drafts/files"

interface DraftFileDialogsProps {
  activeFilePath: string
  fileDialogIntent: {
    kind: "add" | "replace"
    initialMode: SourceMode
  } | null
  insertDialogOpen: boolean
  onCloseFileDialog: () => void
  onCloseInsertDialog: () => void
  onCreateFile: (input: { content: string; filePath: string }) => boolean
  onCreateFolder: (folderPath: string) => boolean
  onInsertFile: (input: { content: string; filePath: string }) => boolean
}

export function DraftFileDialogs({
  activeFilePath,
  fileDialogIntent,
  insertDialogOpen,
  onCloseFileDialog,
  onCloseInsertDialog,
  onCreateFile,
  onCreateFolder,
  onInsertFile,
}: DraftFileDialogsProps) {
  const t = useTranslations("Editor")
  const parentFolderPath = getParentFolderPath(activeFilePath)

  return (
    <>
      <DraftFileSourceDialog
        key={
          fileDialogIntent
            ? `${fileDialogIntent.kind}:${fileDialogIntent.initialMode}:${parentFolderPath}`
            : "closed:file-dialog"
        }
        description={
          fileDialogIntent?.kind === "replace"
            ? t("replaceFileWarning")
            : undefined
        }
        isOpen={fileDialogIntent !== null}
        initialFolderPath={parentFolderPath}
        initialMode={fileDialogIntent?.initialMode}
        onClose={onCloseFileDialog}
        onCreate={onCreateFile}
        onCreateFolder={onCreateFolder}
      />
      <DraftFileSourceDialog
        key={
          insertDialogOpen
            ? `insert:${parentFolderPath}`
            : "closed:insert-dialog"
        }
        isOpen={insertDialogOpen}
        initialFolderPath={parentFolderPath}
        initialMode="repo"
        onClose={onCloseInsertDialog}
        onCreate={onInsertFile}
      />
    </>
  )
}

function getParentFolderPath(filePath: string) {
  const normalized = normalizeDraftFilePath(filePath)
  const lastSlashIndex = normalized.lastIndexOf("/")
  return lastSlashIndex >= 0 ? normalized.slice(0, lastSlashIndex) : ""
}
