"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import { Input } from "@/components/ui/shadcn/input"

interface DraftEditorHeaderProps {
  hasUnsavedChanges: boolean
  isReadOnly: boolean
  isSaving: boolean
  isSubmitting: boolean
  saveDisabled: boolean
  saveError: string | null
  submitDisabled: boolean
  title: string
  onSave: () => void
  onSubmit: () => void
  onTitleChange: (title: string) => void
  submitLabel: string
}

export function DraftEditorHeader({
  hasUnsavedChanges,
  isReadOnly,
  isSaving,
  isSubmitting,
  saveDisabled,
  saveError,
  submitDisabled,
  title,
  onSave,
  onSubmit,
  onTitleChange,
  submitLabel,
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
          aria-busy={isSaving}
        />
        <p className="text-tech-main/60 text-xs" aria-live="polite">
          {saveError
            ? saveError
            : isSaving
              ? t("savingLabel")
              : hasUnsavedChanges
                ? t("unsavedLabel")
                : t("savedLabel")}
        </p>
      </div>
      {!isReadOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saveDisabled}
            aria-busy={isSaving}
            onClick={onSave}>
            {t("saveButton")}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onSubmit}
            disabled={submitDisabled}
            aria-busy={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      ) : null}
    </header>
  )
}
