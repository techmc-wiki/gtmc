"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shadcn/dialog"
import { Input } from "@/components/ui/shadcn/input"

interface DraftFileRenameDialogProps {
  open: boolean
  initialPath: string
  onOpenChange: (open: boolean) => void
  onSubmit: (path: string) => boolean
}

export function DraftFileRenameDialog({
  open,
  initialPath,
  onOpenChange,
  onSubmit,
}: DraftFileRenameDialogProps) {
  const t = useTranslations("Editor")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-modal top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 p-6">
        <DialogHeader>
          <DialogTitle>{t("renameFile")}</DialogTitle>
          <DialogDescription>{t("renameFileHint")}</DialogDescription>
        </DialogHeader>
        <RenamePathForm
          key={initialPath}
          initialPath={initialPath}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function RenamePathForm({
  initialPath,
  onSubmit,
  onCancel,
}: {
  initialPath: string
  onSubmit: (path: string) => boolean
  onCancel: () => void
}) {
  const t = useTranslations("Editor")
  const [path, setPath] = React.useState(initialPath)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (onSubmit(path)) onCancel()
      }}
      className="space-y-4">
      <label htmlFor="draft-rename-path" className="text-sm font-medium">
        {t("targetFileLabel")}
      </label>
      <Input
        id="draft-rename-path"
        value={path}
        onChange={(event) => setPath(event.target.value)}
        placeholder="chapter/article.md"
        required
      />
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("cancelButton")}
        </Button>
        <Button type="submit" disabled={!path.trim()}>
          {t("applyFilePath")}
        </Button>
      </DialogFooter>
    </form>
  )
}
