"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import { Input } from "@/components/ui/shadcn/input"

/** Save/submit activity, rendered as one explicit status line state. */
export type DraftEditorStatus =
  | { kind: "error"; message: string }
  | { kind: "saved" }
  | { kind: "saving" }
  | { kind: "unsaved" }

interface DraftEditorHeaderAction {
  busy: boolean
  disabled: boolean
  onClick: () => void
}

interface DraftEditorHeaderProps {
  isReadOnly: boolean
  onTitleChange: (title: string) => void
  save: DraftEditorHeaderAction
  status: DraftEditorStatus
  submit: DraftEditorHeaderAction & { label: string }
  title: string
}

export function DraftEditorHeader({
  isReadOnly,
  onTitleChange,
  save,
  status,
  submit,
  title,
}: DraftEditorHeaderProps) {
  const t = useTranslations("Editor")

  return (
    <header className="border-tech-main/40 flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <label
          htmlFor="draft-title"
          className="text-tech-main/60 text-xs font-medium">
          {t("titleLabel")}
        </label>
        <Input
          id="draft-title"
          required
          placeholder={t("titlePlaceholder")}
          className="border-tech-main/40 bg-surface-input py-3 text-lg"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          readOnly={isReadOnly}
          aria-busy={status.kind === "saving"}
        />
        <p className="text-tech-main/60 text-xs" aria-live="polite">
          {status.kind === "error"
            ? status.message
            : status.kind === "saving"
              ? t("savingLabel")
              : status.kind === "unsaved"
                ? t("unsavedLabel")
                : t("savedLabel")}
        </p>
      </div>
      {!isReadOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={save.disabled}
            aria-busy={save.busy}
            onClick={save.onClick}>
            {t("saveButton")}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={submit.onClick}
            disabled={submit.disabled}
            aria-busy={submit.busy}>
            {submit.label}
          </Button>
        </div>
      ) : null}
    </header>
  )
}
