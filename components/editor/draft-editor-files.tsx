"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { DraftFileList } from "@/components/editor/draft-file-list"
import { TechButton } from "../ui/tech-button"
import type { SourceMode } from "@/components/editor/draft-file-source-dialog"
import type { DraftFileCollection } from "@/lib/draft-files"

interface DraftEditorFilesProps {
  files: DraftFileCollection["files"]
  activeFileId: string
  unsavedFileIds: Set<string>
  onSelectFile: (fileId: string) => void
  onAddFile: () => void
  onRemoveFile: (fileId: string) => void
  isReadOnly: boolean
  activeFile: { filePath: string; id: string }
  activeFileIndex: number
  activeFileHasDuplicatePath: boolean
  duplicateFilePaths: string[]
  onOpenFileDialog: (kind: "add" | "replace", mode: SourceMode) => void
  onSetInsertDialogIntent: (value: boolean) => void
}

export function DraftEditorFiles({
  files,
  activeFileId,
  unsavedFileIds,
  onSelectFile,
  onAddFile,
  onRemoveFile,
  isReadOnly,
  activeFile,
  activeFileIndex,
  activeFileHasDuplicatePath,
  duplicateFilePaths,
  onOpenFileDialog,
  onSetInsertDialogIntent,
}: DraftEditorFilesProps) {
  const t = useTranslations("Editor")

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <DraftFileList
        files={files}
        activeFileId={activeFileId}
        unsavedFileIds={unsavedFileIds}
        onSelectFile={onSelectFile}
        onAddFile={onAddFile}
        onRemoveFile={onRemoveFile}
        isReadOnly={isReadOnly}
      />

      <div className="space-y-4">
        <div className="border-tech-main/40 border bg-white/80 p-4 backdrop-blur-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-label">{t("activeFileLabel")}</p>
              <p className="text-tech-main/70 font-mono text-xs tracking-widest uppercase">
                {`${t("slotLabel")}_${activeFileIndex}/${files.length}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TechButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={isReadOnly}
                onClick={() => onOpenFileDialog("replace", "repo")}>
                {t("chooseExistingFile")}
              </TechButton>
              <TechButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={isReadOnly}
                onClick={() => onOpenFileDialog("replace", "new")}>
                {t("createTargetFile")}
              </TechButton>
              <TechButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={isReadOnly}
                onClick={() => onOpenFileDialog("replace", "upload")}>
                {t("importTargetFile")}
              </TechButton>
              <TechButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={isReadOnly}
                onClick={() => onOpenFileDialog("add", "folder")}>
                NEW FOLDER
              </TechButton>
              <TechButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={isReadOnly}
                onClick={() => onSetInsertDialogIntent(true)}>
                INSERT FILE LINK
              </TechButton>
            </div>
          </div>

          <div className="guide-line bg-tech-main/5 space-y-3 border p-4">
            <div>
              <p className="text-tech-main/45 font-mono text-[0.6875rem] tracking-widest uppercase">
                {t("targetFileLabel")}
              </p>
              <p className="text-tech-main mt-1 font-mono text-sm tracking-widest break-all uppercase">
                {activeFile.filePath || t("targetFileUnset")}
              </p>
            </div>
            <p className="text-tech-main/65 font-mono text-xs/relaxed">{t("targetFileDescription")}</p>
          </div>

          {activeFileHasDuplicatePath ? (
            <p className="mt-3 font-mono text-xs text-red-500">{t("duplicatePathError")}</p>
          ) : null}

          {!activeFile.filePath && !isReadOnly ? (
            <p className="mt-3 font-mono text-xs text-amber-700">{t("filePathBlankHint")}</p>
          ) : null}

          {duplicateFilePaths.length > 0 ? (
            <p className="mt-2 font-mono text-xs text-red-500">
              {t("duplicatePathsError", { paths: duplicateFilePaths.join(", ") })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
