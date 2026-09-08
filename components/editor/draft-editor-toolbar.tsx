"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  CodeIcon,
  Heading2Icon,
  ImagePlusIcon,
  ListIcon,
  PlusIcon,
  Redo2Icon,
  Undo2Icon,
  WrapTextIcon,
  LoaderCircleIcon,
} from "lucide-react"
import { EditorIconButton } from "@/components/editor/editor-icon-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu"

interface DraftEditorToolbarProps {
  lineWrap: boolean
  onWrapToggle: () => void
  readOnly: boolean
  uploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileSelect: (file: File) => void
  compressing: boolean
  onInsertSyntax: (prefix: string, suffix?: string) => void
  onInsertText: (text: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function DraftEditorToolbar({
  lineWrap,
  onWrapToggle,
  readOnly,
  uploading,
  fileInputRef,
  onFileSelect,
  compressing,
  onInsertSyntax,
  onInsertText,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: DraftEditorToolbarProps) {
  const t = useTranslations("Editor")
  const disabled = readOnly || uploading
  const tools = [
    {
      label: t("undo"),
      icon: Undo2Icon,
      action: onUndo,
      disabled: readOnly || !canUndo,
    },
    {
      label: t("redo"),
      icon: Redo2Icon,
      action: onRedo,
      disabled: readOnly || !canRedo,
    },
    {
      label: t("bold"),
      icon: BoldIcon,
      action: () => onInsertSyntax("**", "**"),
      disabled,
    },
    {
      label: t("italic"),
      icon: ItalicIcon,
      action: () => onInsertSyntax("*", "*"),
      disabled,
    },
    {
      label: t("sectionHeading"),
      icon: Heading2Icon,
      action: () => onInsertSyntax("## "),
      disabled,
    },
    {
      label: t("bulletList"),
      icon: ListIcon,
      action: () => onInsertSyntax("- "),
      disabled,
    },
    {
      label: t("toolbarLink"),
      icon: LinkIcon,
      action: () => onInsertSyntax("[", "](url)"),
      disabled,
    },
    {
      label: t("toolbarCode"),
      icon: CodeIcon,
      action: () => onInsertSyntax("`", "`"),
      disabled,
    },
  ]
  return (
    <fieldset
      className="border-tech-main/20 bg-surface flex w-full min-w-0 items-center gap-0.5 overflow-x-auto border-b px-2 py-1"
      aria-label={t("formattingTools")}>
      {tools.map(
        ({ label, icon: Icon, action, disabled: toolDisabled }, index) => (
          <React.Fragment key={label}>
            {index === 2 && (
              <span aria-hidden className="bg-tech-main/20 mx-1 h-5 w-px" />
            )}
            <EditorIconButton
              type="button"
              variant="ghost"
              size="sm"
              className="size-11 p-0"
              label={label}
              disabled={toolDisabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={action}>
              <Icon aria-hidden className="size-4" />
            </EditorIconButton>
          </React.Fragment>
        )
      )}
      <EditorIconButton
        type="button"
        variant="ghost"
        size="sm"
        className="size-11 p-0"
        label={
          compressing
            ? t("compressingImage")
            : uploading
              ? t("uploadingImage")
              : t("uploadImage")
        }
        aria-busy={uploading}
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}>
        {uploading ? (
          <LoaderCircleIcon
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <ImagePlusIcon aria-hidden className="size-4" />
        )}
      </EditorIconButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFileSelect(file)
          event.target.value = ""
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <EditorIconButton
            type="button"
            variant="ghost"
            size="sm"
            label={t("insert")}
            disabled={disabled}>
            <PlusIcon aria-hidden className="size-4" />
          </EditorIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => onInsertText(t("calloutTemplate"))}>
            {t("callout")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onInsertText(t("tableTemplate"))}>
            {t("table")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onInsertSyntax("```\n", "\n```")}>
            {t("codeBlock")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onInsertSyntax("$$\n", "\n$$")}>
            {t("mathBlock")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              onInsertText("\n```java mc=1.20.1 mapping=yarn\n\n```\n")
            }>
            {t("javaSource")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditorIconButton
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto size-11 p-0"
        label={t("toolbarWrap")}
        aria-pressed={lineWrap}
        onClick={onWrapToggle}>
        <WrapTextIcon aria-hidden className="size-4" />
      </EditorIconButton>
    </fieldset>
  )
}
