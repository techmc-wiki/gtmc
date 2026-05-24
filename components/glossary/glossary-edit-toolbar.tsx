"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import {
  EditorToolbarShell,
  EditorToolbarButton,
  EditorToolbarStatus,
  EditorToolbarDivider,
} from "@/components/editor/editor-toolbar-shell"
import { cn } from "@/lib/cn"

export interface GlossaryEditToolbarProps {
  title: string
  onTitleChange: (title: string) => void
  onDiscard: () => void
  onPreview: () => void
  onSubmit: () => void
  canPreview: boolean
  canSubmit: boolean
  saveState: string
  className?: string
}

export function GlossaryEditToolbar({
  title,
  onTitleChange,
  onDiscard,
  onPreview,
  onSubmit,
  canPreview,
  canSubmit,
  saveState,
  className,
}: GlossaryEditToolbarProps) {
  const t = useTranslations("Glossary")

  return (
    <EditorToolbarShell className={cn(className)}>
      <input
        type="text"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder={t("editorTitlePlaceholder")}
        aria-label={t("editorTitlePlaceholder")}
        className="text-tech-main-dark relative z-10 w-48 border-none bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/30 focus:ring-0 sm:w-64"
      />
      <EditorToolbarDivider />
      <EditorToolbarButton type="button" onClick={onDiscard}>
        {t("editorToolbarDiscard")}
      </EditorToolbarButton>
      <EditorToolbarButton
        type="button"
        onClick={onPreview}
        disabled={!canPreview}
        isActive={canPreview}>
        {t("editorToolbarReview")}
      </EditorToolbarButton>
      <EditorToolbarButton
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        isActive={canSubmit}>
        {t("editorToolbarSubmit")}
      </EditorToolbarButton>
      <EditorToolbarStatus>{saveState}</EditorToolbarStatus>
    </EditorToolbarShell>
  )
}
