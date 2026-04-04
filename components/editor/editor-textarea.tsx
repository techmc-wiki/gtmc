"use client"

import * as React from "react"

interface EditorTextareaProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  onDrop?: (e: React.DragEvent<HTMLTextAreaElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLTextAreaElement>) => void
  onDragEnter?: (e: React.DragEvent<HTMLTextAreaElement>) => void
  isReadOnly?: boolean
  isSaving?: boolean
  placeholder?: string
  "aria-busy"?: boolean
}

export const EditorTextarea = React.forwardRef<
  HTMLTextAreaElement,
  EditorTextareaProps
>(function EditorTextarea(
  {
    value,
    onChange,
    onPaste,
    onDrop,
    onDragOver,
    onDragEnter,
    isReadOnly,
    isSaving,
    placeholder,
    ...rest
  },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={`
          w-full grow resize-none border-none p-6 font-mono
          text-sm/relaxed text-black placeholder-zinc-500 outline-none
          ${isReadOnly ? `cursor-not-allowed bg-gray-50` : `bg-transparent`}
        `}
      placeholder={placeholder ?? "ENTER CONTENT... (Use Markdown)"}
      value={value}
      onChange={onChange}
      onPaste={onPaste}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      readOnly={isReadOnly}
      aria-busy={isSaving}
      {...rest}
    />
  )
})
