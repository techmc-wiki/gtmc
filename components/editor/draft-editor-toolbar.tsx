"use client"

import * as React from "react"
import { MoreHorizontalIcon, Redo2Icon, Undo2Icon } from "lucide-react"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { DraftImageUploadInput } from "@/components/editor/draft-image-upload-input"
import {
  EditorTabStrip,
  type TabType,
} from "@/components/editor/editor-tab-strip"
import { Button } from "@/components/ui/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu"

interface DraftEditorToolbarProps {
  activeTab: TabType
  activeFile: { filePath: string }
  activeFileIndex: number
  lineWrap: boolean
  onWrapToggle: () => void
  readOnly: boolean
  uploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileSelect: (file: File) => void
  compressing: boolean
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
  readOnly,
  uploading,
  fileInputRef,
  onFileSelect,
  compressing,
  onInsertSyntax,
  onInsertText,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: DraftEditorToolbarProps) {
  const fileUploadSlot = React.useMemo(
    () =>
      !readOnly ? (
        <DraftImageUploadInput
          fileInputRef={fileInputRef}
          onFileSelect={onFileSelect}
          isUploading={uploading}
          isCompressing={compressing}
        />
      ) : undefined,
    [readOnly, fileInputRef, onFileSelect, uploading, compressing]
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
            disabled={readOnly || uploading}
            lineWrap={lineWrap}
            onWrapToggle={onWrapToggle}
            fileUploadSlot={fileUploadSlot}
          />
          <div className="border-tech-main/20 flex min-h-11 items-center justify-end gap-1 border-b px-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={readOnly}
                  aria-label="Insert Markdown">
                  <MoreHorizontalIcon aria-hidden className="size-4" />
                  Insert
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-tech-main/40 bg-surface-modal rounded-none">
                <DropdownMenuItem
                  onSelect={() => onInsertText("\n## Section title\n\n")}>
                  Section heading
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    onInsertText(
                      "\n> [!TIP]\n> Add contributor guidance here.\n\n"
                    )
                  }>
                  Callout
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    onInsertText(
                      "\n| Parameter | Value | Notes |\n| --- | --- | --- |\n| Example | Value | Detail |\n\n"
                    )
                  }>
                  Table
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={readOnly || !canUndo}
              onClick={onUndo}
              aria-label="Undo">
              <Undo2Icon aria-hidden className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={readOnly || !canRedo}
              onClick={onRedo}
              aria-label="Redo">
              <Redo2Icon aria-hidden className="size-4" />
            </Button>
          </div>
        </>
      )}
    </>
  )
}
