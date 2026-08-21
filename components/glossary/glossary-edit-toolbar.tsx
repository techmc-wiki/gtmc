"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { GitPullRequest, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/shadcn/button"
import { Input } from "@/components/ui/shadcn/input"
import { Badge } from "@/components/ui/shadcn/badge"
import { cn } from "@/lib/cn"

export interface GlossaryEditToolbarProps {
  title: string
  onTitleChange: (title: string) => void
  onDiscard: () => void
  onSubmit: () => void
  canSubmit: boolean
  saveState: string
  className?: string
  isReadOnly?: boolean
}

export function GlossaryEditToolbar({
  title,
  onTitleChange,
  onDiscard,
  onSubmit,
  canSubmit,
  saveState,
  className,
  isReadOnly = false,
}: GlossaryEditToolbarProps) {
  const t = useTranslations("Glossary")

  const handleTitleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onTitleChange(event.target.value)
    },
    [onTitleChange]
  )

  const isSaving = saveState.toLowerCase().includes("saving")
  const isError =
    saveState.toLowerCase().includes("fail") ||
    saveState.toLowerCase().includes("error")

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-none border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4",
        className
      )}>
      <div className="flex flex-1 items-center gap-3">
        <Input
          type="text"
          value={title}
          onChange={handleTitleChange}
          disabled={isReadOnly}
          placeholder={t("editorTitlePlaceholder")}
          aria-label={t("editorTitlePlaceholder")}
          className="h-9 max-w-xs text-xs font-medium sm:max-w-md sm:text-sm"
        />
        {saveState && (
          <Badge
            variant={isError ? "destructive" : isSaving ? "pending" : "neutral"}
            className="shrink-0 font-mono text-[10px] uppercase">
            {saveState}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {!isReadOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDiscard}
            className="text-xs">
            <Trash2 className="text-muted-foreground mr-1 size-3.5" />
            {t("editorToolbarDiscard")}
          </Button>
        )}
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onSubmit}
          disabled={!canSubmit || isReadOnly}
          className="text-xs">
          <GitPullRequest className="mr-1.5 size-3.5" />
          {t("editorToolbarSubmit")}
        </Button>
      </div>
    </div>
  )
}
