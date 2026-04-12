"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { TechButton } from "@/components/ui/tech-button"
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
    <aside
      className="
      flex flex-col border border-tech-main/30 bg-white/40 backdrop-blur-sm
      shadow-[inset_0_0_40px_rgba(96,112,143,0.05)]
    ">
      <div
        className="
          flex items-center justify-between gap-3 border-b border-tech-main/30
          bg-tech-main/[0.03] px-4 py-3
        ">
        <div className="min-w-0 flex-1 flex flex-col gap-1 text-tech-main/80 pt-1">
          <div className="flex items-center justify-start gap-2 h-4">
            <span className="font-mono text-xs font-bold tracking-widest uppercase text-tech-main-dark whitespace-nowrap">
              FILE_NODE_TREE
            </span>
            <span className="font-mono text-[9px] border border-tech-main/30 bg-tech-main/10 px-1 rounded-sm">
              {files.length}
            </span>
          </div>
          <p
            className="
               truncate font-mono text-[9px] text-tech-main/50 uppercase
               tracking-wide flex items-center gap-1
             "
            title="SAVE_AND_REVIEW_APPLY_TO_ALL_FILES">
            <span className="w-1 h-1 bg-tech-main/30 rounded-full" />
            SAVE_AND_REVIEW_APPLY_TO_ALL
          </p>
        </div>
        {!isReadOnly ? (
          <TechButton
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 hover:bg-tech-main/10 transition-colors"
            onClick={onAddFile}>
            <span className="mr-1">+</span> {t("addButton")}
          </TechButton>
        ) : null}
      </div>

      <div className="space-y-[2px] p-2 flex-1 overflow-y-auto">
        {files.map((file: { id: string; filePath: string }, index: number) => {
          const fileLabel =
            file.filePath.split("/").filter(Boolean).slice(-1)[0] ||
            `UNTITLED_FILE_${index + 1}`
          const isActive = file.id === activeFileId
          const isUnsaved = unsavedFileIds?.has(file.id) ?? false

          return (
            <div key={file.id} className="group relative flex items-stretch border-l-2 ml-1" style={{ borderColor: isActive ? "var(--color-tech-main)" : "transparent" }}>
              {/* Simple Tech Tree Connector */}
              {!isActive && <div className="absolute left-[-6px] top-1/2 w-1.5 h-[1px] bg-tech-main/20" />}
              {isActive && <div className="absolute left-[-2px] inset-y-0 w-0.5 bg-tech-main group-hover:animate-target-blink" />}

              <button
                type="button"
                onClick={() => onSelectFile(file.id)}
                className={`
                  flex min-h-[46px] min-w-0 flex-1 flex-col items-start gap-[2px] border
                  px-3 py-2 text-left transition-all duration-200 ml-1
                  ${
                    isActive
                      ? `border-tech-main bg-tech-main/[0.08] shadow-[0_2px_10px_rgba(96,112,143,0.08)] scale-[1.01] z-10`
                      : `
                        border-transparent bg-transparent
                        hover:border-tech-main/30 hover:bg-tech-main/[0.03]
                      `
                  }
                `}>
                <span className="flex w-full items-center justify-between">
                  <span
                    className={`
                      truncate font-mono tracking-widest transition-colors
                      uppercase flex items-center gap-2
                      ${isActive ? "text-tech-main font-bold text-xs" : "text-tech-main/70 text-[11px] font-medium"}
                    `}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={isActive ? "text-tech-main" : "text-tech-main/40"}
                    >
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    {fileLabel}
                  </span>
                  {isUnsaved ? (
                    <span
                      className="size-[6px] shrink-0 bg-amber-500 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.5)] border border-amber-900/10"
                      title="UNSAVED_CHANGES"
                      aria-label="Unsaved changes"
                    />
                  ) : null}
                </span>
                <span
                  className={`
                     w-full truncate font-mono text-[9px] transition-colors pl-5
                     ${isActive ? "text-tech-main/80" : "text-tech-main/40"}
                   `}>
                  {file.filePath || "TARGET_PATH_NOT_SET"}
                </span>
              </button>

              {!isReadOnly && files.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onRemoveFile(file.id)}
                  title={t("removeFile")}
                  className={`
                    flex min-w-[32px] shrink-0 items-center justify-center
                    transition-all duration-200 border-y border-r ml-px
                    ${
                      isActive
                        ? `
                          border-tech-main bg-tech-main/[0.04] text-tech-main/60
                          hover:border-red-500/50 hover:bg-red-500/10
                          hover:text-red-600 hover:shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]
                        `
                        : `
                          border-transparent bg-transparent text-tech-main/20
                          group-hover:border-tech-main/20 group-hover:bg-white/30
                          hover:border-red-500/40 hover:bg-red-500/10
                          hover:text-red-500 opacity-0 group-hover:opacity-100
                        `
                    }
                  `}>
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
              ) : null}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
