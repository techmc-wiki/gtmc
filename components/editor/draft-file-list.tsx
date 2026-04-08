"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { TechButton } from "@/components/ui/tech-button"
import { type DraftFileCollection } from "@/lib/draft-files"

interface DraftFileListProps {
  files: DraftFileCollection["files"]
  activeFileId: string
  onSelectFile: (fileId: string) => void
  onAddFile: () => void
  onRemoveFile: (fileId: string) => void
  isReadOnly: boolean
}

export function DraftFileList({
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onRemoveFile,
  isReadOnly,
}: DraftFileListProps) {
  const t = useTranslations("DraftFiles")

  return (
    <aside
      className="
      border border-tech-main/40 bg-tech-main/5 backdrop-blur-sm
    ">
      <div
        className="
          flex items-center justify-between gap-3 border-b border-tech-main/30
          px-4 py-3
        ">
        <div className="min-w-0 flex-1">
          <p
            className="
              font-mono text-xs tracking-widest text-tech-main uppercase
            ">
            FILES_[{files.length}]
          </p>
          <p
            className="
               truncate font-mono text-[0.6875rem] text-tech-main/60 uppercase
             "
            title="SAVE_AND_REVIEW_APPLY_TO_ALL_FILES">
            SAVE_AND_REVIEW_APPLY_TO_ALL_FILES
          </p>
        </div>
        {!isReadOnly ? (
          <TechButton
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={onAddFile}>
            {t("addButton")}
          </TechButton>
        ) : null}
      </div>

      <div className="space-y-2 p-2">
        {files.map((file: { id: string; filePath: string }, index: number) => {
          const fileLabel =
            file.filePath.split("/").filter(Boolean).slice(-1)[0] ||
            `UNTITLED_FILE_${index + 1}`
          const isActive = file.id === activeFileId

          return (
            <div key={file.id} className="relative flex items-stretch">
              <button
                type="button"
                onClick={() => onSelectFile(file.id)}
                className={`
                  flex min-h-11 min-w-0 flex-1 flex-col items-start gap-1 border
                  px-3 py-2 text-left transition-colors
                  ${
                    isActive
                      ? `border-tech-main bg-tech-main/10`
                      : `
                        guide-line bg-white/70
                        hover:border-tech-main/50 hover:bg-white/90
                      `
                  }
                `}>
                <span
                  className="
                    w-full truncate font-mono text-xs tracking-widest
                    text-tech-main uppercase
                  ">
                  {fileLabel}
                </span>
                <span
                  className="
                     w-full truncate font-mono text-[0.6875rem] text-tech-main/60
                   ">
                  {file.filePath || "PATH_NOT_SET"}
                </span>
              </button>

              {!isReadOnly && files.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onRemoveFile(file.id)}
                  title={t("removeFile")}
                  className={`
                    flex min-w-8 shrink-0 items-center justify-center border-y
                    border-r transition-colors
                    ${
                      isActive
                        ? `
                          border-tech-main bg-tech-main/5 text-tech-main/60
                          hover:border-red-500/30 hover:bg-red-500/10
                          hover:text-red-500
                        `
                        : `
                          guide-line bg-white/50 text-tech-main/40
                          hover:border-red-500/30 hover:bg-red-500/10
                          hover:text-red-500
                        `
                    }
                  `}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    aria-label={t("removeFile")}>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
