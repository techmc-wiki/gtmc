"use client"

import { IconButton } from "@/components/ui/icon-button"

import * as React from "react"
import { useTranslations } from "next-intl"
import { GitPullRequest, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/shadcn/button"
import { Input } from "@/components/ui/shadcn/input"
import { Badge } from "@/components/ui/shadcn/badge"

export interface GlossaryEditToolbarProps {
  title: string
  onTitleChange: (title: string) => void
  onDiscard: () => void
  onSubmit: () => void
  canSubmit: boolean
  isSaving: boolean
  isReadOnly?: boolean
}

export function GlossaryEditToolbar({
  title,
  onTitleChange,
  onDiscard,
  onSubmit,
  canSubmit,
  isSaving,
  isReadOnly = false,
}: GlossaryEditToolbarProps) {
  const t = useTranslations("Glossary")

  const handleTitleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onTitleChange(event.target.value)
    },
    [onTitleChange]
  )

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-none border p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex flex-1 items-center gap-3">
        <Input
          type="text"
          value={title}
          onChange={handleTitleChange}
          disabled={isReadOnly}
          placeholder={t("editorTitlePlaceholder")}
          aria-label={t("editorTitlePlaceholder")}
          className="max-w-xs sm:max-w-md"
        />
        {isSaving && <Badge variant="pending">Saving…</Badge>}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {!isReadOnly && (
          <IconButton
            type="button"
            variant="outline"
            onClick={onDiscard}
            label={t("editorToolbarDiscard")}>
            <Trash2 aria-hidden />
          </IconButton>
        )}
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onSubmit}
          disabled={!canSubmit || isReadOnly}>
          <GitPullRequest className="size-3.5" />
          {t("editorToolbarSubmit")}
        </Button>
      </div>
    </div>
  )
}
