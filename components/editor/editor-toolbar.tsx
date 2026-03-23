"use client"

import * as React from "react"

interface EditorToolbarProps {
  onInsert: (prefix: string, suffix?: string) => void
  disabled?: boolean
  fileUploadSlot?: React.ReactNode
}

export function EditorToolbar({
  onInsert,
  disabled = false,
  fileUploadSlot,
}: EditorToolbarProps) {
  const btnClass = `h-11 min-w-[44px] flex-1 border border-transparent px-3 transition-colors select-none hover:border-white/20 hover:bg-tech-accent/20 sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5 ${!disabled ? "cursor-pointer" : ""}`
  const smBtnClass = `hidden border border-transparent px-3 py-1.5 transition-colors select-none hover:border-white/20 hover:bg-tech-accent/20 sm:block ${!disabled ? "cursor-pointer" : ""}`

  return (
    <div
      className="
        sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b
        border-tech-main/40 bg-tech-main p-2 px-2 font-mono text-xs
        text-white/90
        sm:gap-2 sm:px-4
      ">
      <button
        type="button"
        onClick={() => onInsert("**", "**")}
        disabled={disabled}
        className={btnClass}>
        <b>B</b>
      </button>
      <button
        type="button"
        onClick={() => onInsert("*", "*")}
        disabled={disabled}
        className={btnClass}>
        <i>I</i>
      </button>
      <button
        type="button"
        onClick={() => onInsert("[", "](url)")}
        disabled={disabled}
        className={btnClass}>
        Link
      </button>
      {fileUploadSlot}
      <div
        className="
          mx-1 hidden h-4 w-px bg-white/30
          sm:block
        "
      />
      <button
        type="button"
        onClick={() => onInsert("### ")}
        disabled={disabled}
        className={smBtnClass}>
        H3
      </button>
      <button
        type="button"
        onClick={() => onInsert("`", "`")}
        disabled={disabled}
        className={smBtnClass}>
        Code
      </button>
      <button
        type="button"
        onClick={() => onInsert("```\n", "\n```")}
        disabled={disabled}
        className={smBtnClass}>
        Block
      </button>
      <span
        className="
          ml-auto hidden items-center gap-2 text-xs text-tech-accent/60
          opacity-60
          sm:flex
        ">
        MARKDOWN_SUPPORTED_
      </span>
    </div>
  )
}
