"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shadcn/dialog"
import type { DraftFileCollection } from "@/lib/drafts/files"

interface DraftFileRemoveDialogProps {
  file: DraftFileCollection["files"][number] | null
  onOpenChange: (open: boolean) => void
  onConfirm: (fileId: string) => void
}

export function DraftFileRemoveDialog({
  file,
  onOpenChange,
  onConfirm,
}: DraftFileRemoveDialogProps) {
  const t = useTranslations("Editor")
  const fileT = useTranslations("DraftFiles")

  return (
    <Dialog open={file !== null} onOpenChange={onOpenChange}>
      <DialogContent className="border-tech-main/40 bg-surface-modal top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6">
        <DialogHeader>
          <DialogTitle>{fileT("removeFile")}</DialogTitle>
          <DialogDescription>
            {t("removeFileDescription", {
              file: file?.filePath || t("targetFileUnset"),
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {t("cancelButton")}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (file) onConfirm(file.id)
              onOpenChange(false)
            }}>
            {fileT("removeFileButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
