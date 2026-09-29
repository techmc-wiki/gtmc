"use client"

import { MoreHorizontalIcon, Trash2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import type { SourceMode } from "@/components/editor/draft-file-source-dialog"
import { Button } from "@/components/ui/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu"

interface DraftFileActionsMenuProps {
  isReadOnly: boolean
  canRemove: boolean
  onRequestRename: () => void
  onInsertFileLink: () => void
  onOpenFileDialog: (kind: "add" | "replace", mode: SourceMode) => void
  onRequestRemove: () => void
}

export function DraftFileActionsMenu({
  isReadOnly,
  canRemove,
  onRequestRename,
  onInsertFileLink,
  onOpenFileDialog,
  onRequestRemove,
}: DraftFileActionsMenuProps) {
  const t = useTranslations("Editor")
  const fileT = useTranslations("DraftFiles")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-11 p-0"
          aria-label={t("fileActionsAria")}
          disabled={isReadOnly}>
          <MoreHorizontalIcon aria-hidden className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onRequestRename}>
          {t("renameFile")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onInsertFileLink}>
          {t("insertFileLink")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpenFileDialog("add", "folder")}>
          {t("createFolder")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onOpenFileDialog("replace", "repo")}>
          {t("chooseExistingFile")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onOpenFileDialog("replace", "upload")}>
          {t("importTargetFile")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canRemove}
          onSelect={onRequestRemove}
          className="text-red-700 dark:text-red-400">
          <Trash2Icon aria-hidden className="size-4" />
          {fileT("removeFile")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
