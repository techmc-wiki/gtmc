"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import {
  EditorToolbarShell,
  EditorToolbarButton,
  EditorToolbarDivider,
  EditorToolbarStatus,
} from "@/components/editor/editor-toolbar-shell"

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

  return (
    <EditorToolbarShell>
      <EditorToolbarButton
        type="button"
        onClick={() => onInsert("**", "**")}
        disabled={disabled}>
        <b className="font-sans text-xs">B</b>
      </EditorToolbarButton>
      <EditorToolbarButton
        type="button"
        onClick={() => onInsert("*", "*")}
        disabled={disabled}>
        <i className="font-sans text-xs">I</i>
      </EditorToolbarButton>
      <EditorToolbarDivider />
      <EditorToolbarButton
        type="button"
        onClick={() => onInsert("[", "](url)")}
        disabled={disabled}
        title={t("toolbarLink")}>
        LINK
      </EditorToolbarButton>
      {fileUploadSlot}
      <EditorToolbarDivider className="hidden sm:block" />
      <EditorToolbarButton
        type="button"
        onClick={() => onInsert("### ")}
        disabled={disabled}
        variant="small">
        H3
      </EditorToolbarButton>
      <EditorToolbarButton
        type="button"
        onClick={() => onInsert("`", "`")}
        disabled={disabled}
        variant="small"
        title={t("toolbarCode")}>
        CODE
      </EditorToolbarButton>
      <EditorToolbarButton
        type="button"
        onClick={() => onInsert("```\n", "\n```")}
        disabled={disabled}
        variant="small"
        title={t("toolbarBlock")}>
        BLOCK
      </EditorToolbarButton>
      <EditorToolbarStatus>MD_SYNTAX_READY</EditorToolbarStatus>
      {onWrapToggle !== undefined && (
        <>
          <EditorToolbarDivider className="mx-2 hidden sm:block" />
          <EditorToolbarButton
            type="button"
            onClick={onWrapToggle}
            disabled={false}
            isActive={lineWrap}
            className="hidden sm:flex"
            aria-pressed={lineWrap}>
            {t("toolbarWrap")} {lineWrap ? "[ON]" : "[OFF]"}
          </EditorToolbarButton>
        </>
      )}
    </EditorToolbarShell>
  )
}
