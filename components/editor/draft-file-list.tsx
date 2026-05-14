"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { TechButton } from "@/components/ui/tech-button"
import {
  FileListSidebar,
  FileListHeader,
  FileListContainer,
  FileListItem,
  UnsavedIndicator,
} from "@/components/ui/file-list"
import { type DraftFileCollection } from "@/lib/draft-files"

interface DraftFileListProps {
  files: DraftFileCollection["files"]
  activeFileId: string
  unsavedFileIds?: Set<string>
  onSelectFile: (fileId: string) => void
  onAddFile: () => void
  onRemoveFile: (fileId: string) => void
  isReadOnly: boolean
}

export function DraftFileList({
  files,
  activeFileId,
  unsavedFileIds,
  onSelectFile,
  onAddFile,
  onRemoveFile,
  isReadOnly,
}: DraftFileListProps) {
  const t = useTranslations("DraftFiles")

  return (
    <FileListSidebar>
      <FileListHeader
        title="FILE_NODE_TREE"
        subtitle="SAVE_AND_REVIEW_APPLY_TO_ALL"
        count={files.length}
        actions={
          !isReadOnly ? (
            <TechButton
              type="button"
              variant="secondary"
              size="sm"
              className="hover:bg-tech-main/10 shrink-0 transition-colors"
              onClick={onAddFile}>
              <span className="mr-1">+</span> {t("addButton")}
            </TechButton>
          ) : null
        }
      />

      <FileListContainer>
        {files.map((file, index) => {
          const isActive = file.id === activeFileId
          const isUnsaved = unsavedFileIds?.has(file.id) ?? false
          const showRemoveButton = !isReadOnly && files.length > 1

          return (
            <FileListItem
              key={file.id}
              fileId={file.id}
              filePath={file.filePath}
              index={index}
              isActive={isActive}
              onSelect={onSelectFile}
              primaryAction={
                isUnsaved ? <UnsavedIndicator title="UNSAVED_CHANGES" /> : null
              }
              secondaryAction={
                showRemoveButton ? (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(file.id)}
                    title={t("removeFile")}
                    className={`ml-px flex min-w-[32px] shrink-0 items-center justify-center border-y border-r transition-all duration-200 ${
                      isActive
                        ? `border-tech-main bg-tech-main/4 text-tech-main/60 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-600 hover:shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]`
                        : `text-tech-main/20 group-hover:guide-line border-transparent bg-transparent opacity-0 group-hover:bg-white/30 group-hover:opacity-100 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500`
                    } `}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      aria-label={t("removeFile")}>
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                ) : null
              }
            />
          )
        })}
      </FileListContainer>
    </FileListSidebar>
  )
}
