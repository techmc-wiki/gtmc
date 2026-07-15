"use client"

import * as React from "react"

import { EditorToolbarButton } from "@/components/editor/editor-toolbar-shell"

interface DraftImageUploadInputProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileSelect: (file: File) => void
  isUploading: boolean
  isCompressing: boolean
  disabled?: boolean
}

export function DraftImageUploadInput({
  fileInputRef,
  onFileSelect,
  isUploading,
  isCompressing,
  disabled = false,
}: DraftImageUploadInputProps) {
  const handleClick = React.useCallback(
    () => fileInputRef.current?.click(),
    [fileInputRef]
  )

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        onFileSelect(file)
        event.target.value = ""
      }
    },
    [onFileSelect]
  )

  return (
    <>
      <EditorToolbarButton
        type="button"
        variant="upload"
        onClick={handleClick}
        disabled={disabled || isUploading}
        aria-busy={isUploading}>
        {isCompressing ? "CMP" : isUploading ? "UPL" : "IMG"}
      </EditorToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleChange}
        aria-label="Upload image"
      />
    </>
  )
}
