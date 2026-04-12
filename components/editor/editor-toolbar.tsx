"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

interface EditorToolbarProps {
  onInsert: (prefix: string, suffix?: string) => void
  disabled?: boolean
  fileUploadSlot?: React.ReactNode
  lineWrap?: boolean
  onWrapToggle?: () => void
}

export function EditorToolbar({
  onInsert,
  disabled = false,
  fileUploadSlot,
  lineWrap,
  onWrapToggle,
}: EditorToolbarProps) {
  const t = useTranslations("Editor")
  const btnClass = `relative h-8 min-w-[32px] flex items-center justify-center border border-transparent px-3 text-[10px] tracking-widest uppercase transition-all duration-200 select-none hover:border-tech-accent/40 hover:bg-tech-accent/10 hover:text-white hover:shadow-[0_0_10px_rgba(196,208,223,0.1)] sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5 ${!disabled ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`
  const smBtnClass = `relative hidden h-8 items-center justify-center border border-transparent px-3 py-1 text-[10px] tracking-widest uppercase transition-all duration-200 select-none hover:border-tech-accent/40 hover:bg-tech-accent/10 hover:text-white hover:shadow-[0_0_10px_rgba(196,208,223,0.1)] sm:flex ${!disabled ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`

  return (
    <div
      className="
        sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b
        border-tech-main-dark bg-tech-main-dark p-2 px-2 font-mono
        text-white/70 shadow-[0_2px_10px_rgba(74,90,120,0.2)]
        before:absolute before:inset-0 before:bg-[url('/bg-grid.svg')] before:bg-[length:24px_24px] before:opacity-[0.05] before:pointer-events-none
        sm:gap-1 sm:px-4
      ">
      <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-tech-accent/20 to-transparent left-0" />
      
      <button
        type="button"
        onClick={() => onInsert("**", "**")}
        disabled={disabled}
        className={btnClass}>
        <b className="font-sans text-xs">B</b>
      </button>
      <button
        type="button"
        onClick={() => onInsert("*", "*")}
        disabled={disabled}
        className={btnClass}>
        <i className="font-sans text-xs">I</i>
      </button>
      <div className="mx-1 h-4 w-px bg-white/10" />
      <button
        type="button"
        onClick={() => onInsert("[", "](url)")}
        disabled={disabled}
        className={btnClass}
        title={t("toolbarLink")}>
        LINK
      </button>
      {fileUploadSlot}
      <div
        className="
          mx-1 hidden h-4 w-px bg-white/10
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
        className={smBtnClass}
        title={t("toolbarCode")}>
        CODE
      </button>
      <button
        type="button"
        onClick={() => onInsert("```\n", "\n```")}
        disabled={disabled}
        className={smBtnClass}
        title={t("toolbarBlock")}>
        BLOCK
      </button>
      <span
        className="
          ml-auto hidden items-center gap-2 text-[9px] tracking-widest text-tech-accent/40 uppercase
          sm:flex
        ">
        <span className="h-1.5 w-1.5 rounded-full bg-tech-accent/40 animate-pulse" />
        MD_SYNTAX_READY
      </span>
      {onWrapToggle !== undefined && (
        <>
          <div className="mx-2 hidden h-4 w-px bg-white/10 sm:block" />
          <button
            type="button"
            onClick={onWrapToggle}
            className={`hidden border px-3 py-1 font-mono text-[9px] tracking-widest uppercase transition-all duration-200 select-none sm:block ${
              lineWrap
                ? "border-tech-accent bg-tech-accent/20 text-white shadow-[0_0_8px_rgba(196,208,223,0.2)]"
                : "border-transparent text-white/50 hover:border-tech-accent/30 hover:bg-tech-accent/10 hover:text-white"
            }`}
            aria-pressed={lineWrap}>
            {t("toolbarWrap")} {lineWrap ? '[ON]' : '[OFF]'}
          </button>
        </>
      )}
    </div>
  )
}
