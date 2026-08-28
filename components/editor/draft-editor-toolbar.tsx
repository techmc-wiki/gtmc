"use client"

import * as React from "react"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { DraftImageUploadInput } from "@/components/editor/draft-image-upload-input"
import {
  EditorTabStrip,
  type TabType,
} from "@/components/editor/editor-tab-strip"
import { Button } from "@/components/ui/shadcn/button"

interface DraftEditorToolbarProps {
  activeTab: TabType
  activeFile: { filePath: string }
  activeFileIndex: number
  lineWrap: boolean
  onWrapToggle: () => void
  isReadOnly: boolean
  isUploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileSelect: (file: File) => void
  isCompressing: boolean
  onInsertSyntax: (prefix: string, suffix?: string) => void
  onInsertText: (text: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function DraftEditorToolbar({
  activeTab,
  activeFile,
  activeFileIndex,
  lineWrap,
  onWrapToggle,
  isReadOnly,
  isUploading,
  fileInputRef,
  onFileSelect,
  isCompressing,
  onInsertSyntax,
  onInsertText,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: DraftEditorToolbarProps) {
  const fileUploadSlot = React.useMemo(
    () =>
      !isReadOnly ? (
        <DraftImageUploadInput
          fileInputRef={fileInputRef}
          onFileSelect={onFileSelect}
          isUploading={isUploading}
          isCompressing={isCompressing}
        />
      ) : undefined,
    [isReadOnly, fileInputRef, onFileSelect, isUploading, isCompressing]
  )

  return (
    <>
      <div className="md:hidden">
        <EditorTabStrip
          rightSlot={activeFile.filePath || `UNTITLED_FILE_${activeFileIndex}`}
        />
      </div>

      {activeTab === "write" && (
        <>
          <EditorToolbar
            onInsert={onInsertSyntax}
            disabled={isReadOnly || isUploading}
            lineWrap={lineWrap}
            onWrapToggle={onWrapToggle}
            fileUploadSlot={fileUploadSlot}
          />
          <div className="guide-line bg-tech-main/4 relative flex h-12 items-center gap-2 overflow-x-auto scroll-smooth border-b px-4 shadow-[inset_0_1px_4px_rgb(var(--color-tech-main)/0.05)]">
            <div className="bg-tech-main/30 absolute inset-y-0 left-0 w-1" />
            <span className="text-tech-main/60 mr-2 text-xs font-medium opacity-70">
              MACROS
            </span>

            <Button
              type="button"
              variant="ghost"
              className="text-tech-main hover:guide-line hover:text-tech-main hover:bg-surface-overlay h-7 border border-transparent px-3 text-[10px] tracking-widest transition-[background-color,border-color,box-shadow] hover:shadow-sm"
              disabled={isReadOnly}
              onClick={() => onInsertText("\n## Section Title\n\n")}>
              <span className="flex items-center gap-1.5">
                <span className="text-tech-main/40 font-bold">#</span> SECTION
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-tech-main hover:guide-line hover:text-tech-main hover:bg-surface-overlay h-7 border border-transparent px-3 text-[10px] tracking-widest transition-[background-color,border-color,box-shadow] hover:shadow-sm"
              disabled={isReadOnly}
              onClick={() =>
                onInsertText("\n> [!TIP]\n> Add contributor guidance here.\n\n")
              }>
              <span className="flex items-center gap-1.5">
                <span className="text-tech-main/40 font-bold">{">"}</span>{" "}
                CALLOUT
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-tech-main hover:guide-line hover:text-tech-main hover:bg-surface-overlay h-7 border border-transparent px-3 text-[10px] tracking-widest transition-[background-color,border-color,box-shadow] hover:shadow-sm"
              disabled={isReadOnly}
              onClick={() =>
                onInsertText(
                  "\n| Parameter | Value | Notes |\n| --- | --- | --- |\n| Example | Value | Detail |\n\n"
                )
              }>
              <span className="flex items-center gap-1.5">
                <span className="text-tech-main/40 font-bold">||</span> TABLE
              </span>
            </Button>

            <div className="bg-tech-main/20 mx-2 h-4 w-px" />

            <Button
              type="button"
              variant="secondary"
              className="group guide-line text-tech-main-dark/80 hover:border-tech-main/50 bg-surface-overlay/50 hover:bg-surface-overlay h-7 px-3 text-[10px] font-bold tracking-widest transition-colors"
              disabled={isReadOnly || !canUndo}
              onClick={onUndo}>
              <span className="flex items-center gap-1">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square">
                  <path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3z" />
                </svg>
                UNDO
              </span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="group guide-line text-tech-main-dark/80 hover:border-tech-main/50 bg-surface-overlay/50 hover:bg-surface-overlay h-7 px-3 text-[10px] font-bold tracking-widest transition-colors"
              disabled={isReadOnly || !canRedo}
              onClick={onRedo}>
              <span className="flex items-center gap-1">
                REDO
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                  className="scale-x-[-1]">
                  <path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3z" />
                </svg>
              </span>
            </Button>
          </div>
        </>
      )}
    </>
  )
}
