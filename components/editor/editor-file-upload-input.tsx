"use client"

import * as React from "react"

interface EditorFileUploadInputProps {
  fileInputRef: React.RefObject<HTMLInputElement>
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
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className={`
          h-11 min-w-11 flex-1 border border-transparent px-3
          transition-colors select-none
          hover:border-white/20 hover:bg-tech-accent/20
          sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5
          ${disabled || isUploading ? "" : "cursor-pointer"}
        `}
        aria-busy={isUploading}>
        {isCompressing ? "CMP" : isUploading ? "UPL" : "FILES"}
      </button>
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
