"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import {
  CheckIcon,
  CircleAlertIcon,
  LoaderCircleIcon,
  SaveIcon,
  ArrowRightIcon,
  BookOpenIcon,
} from "lucide-react"
import { EditorIconButton } from "@/components/editor/editor-icon-button"
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
  onOpenGuide: () => void
  isReadOnly: boolean
  onTitleChange: (title: string) => void
  save: DraftEditorHeaderAction
  status: DraftEditorStatus
  submit: DraftEditorHeaderAction
  title: string
}

export function DraftEditorHeader({
  onOpenGuide,
  isReadOnly,
  onTitleChange,
  save,
  status,
  submit,
  title,
}: DraftEditorHeaderProps) {
  const t = useTranslations("Editor")

  return (
    <header className="border-tech-main/25 flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <label
          htmlFor="draft-title"
          className="text-tech-main/60 text-xs font-medium">
          {t("titleLabel")}
        </label>
        <Input
          id="draft-title"
          required
          placeholder={t("titlePlaceholder")}
          className="hover:border-tech-main/30 focus:border-tech-main border-transparent bg-transparent px-0 py-1 font-sans text-xl font-semibold shadow-none sm:px-0 sm:py-1 sm:text-2xl"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          readOnly={isReadOnly}
          aria-busy={status.kind === "saving"}
        />
        <p
          className="text-tech-main flex items-center gap-2 text-xs"
          aria-live="polite"
          role={status.kind === "error" ? "alert" : "status"}>
          {status.kind === "saving" ? (
            <LoaderCircleIcon
              aria-hidden
              className="size-3.5 animate-spin motion-reduce:animate-none"
            />
          ) : status.kind === "saved" ? (
            <CheckIcon aria-hidden className="size-3.5" />
          ) : (
            <CircleAlertIcon aria-hidden className="size-3.5" />
          )}
          {status.kind === "error"
            ? status.message
            : status.kind === "saving"
              ? t("savingLabel")
              : status.kind === "unsaved"
                ? t("unsavedLabel")
                : t("savedLabel")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <EditorIconButton label={t("writingGuide")} onClick={onOpenGuide}>
          <BookOpenIcon aria-hidden />
        </EditorIconButton>
        {!isReadOnly ? (
          <>
            <EditorIconButton
              label={t("saveButton")}
              disabled={save.disabled}
              aria-busy={save.busy}
              onClick={save.onClick}>
              <SaveIcon aria-hidden />
            </EditorIconButton>
            <Button
              type="button"
              size="sm"
              className="min-h-11 px-3 font-sans tracking-normal normal-case"
              onClick={submit.onClick}
              disabled={submit.disabled}
              aria-busy={submit.busy}>
              {t("reviewAndSubmit")}
              <ArrowRightIcon aria-hidden className="size-4" />
            </Button>
          </>
        ) : (
          <span className="text-tech-main text-sm">{t("readOnlyDraft")}</span>
        )}
      </div>
    </header>
  )
}
