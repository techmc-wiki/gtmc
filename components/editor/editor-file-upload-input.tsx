"use client"

import * as React from "react"
import { EditorToolbarButton } from "@/components/editor/editor-toolbar-shell"

interface EditorFileUploadInputProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileSelect: (file: File) => void
  isUploading: boolean
  isCompressing: boolean
  disabled?: boolean
}

export function EditorFileUploadInput({
  fileInputRef,
  onFileSelect,
  isUploading,
  isCompressing,
  disabled = false,
}: EditorFileUploadInputProps) {
  return (
    <>
      <EditorToolbarButton
        type="button"
        variant="upload"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        aria-busy={isUploading}>
        {isCompressing ? "CMP" : isUploading ? "UPL" : "FILES"}
      </EditorToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,text/plain,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            onFileSelect(file)
            e.target.value = ""
          }
        }}
      />
    </>
  )
}
