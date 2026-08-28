"use client"

import * as React from "react"
import { MoreHorizontalIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import type { SourceMode } from "@/components/editor/draft-file-source-dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/shadcn/sheet"
import { cn } from "@/lib/cn"
import type { DraftFileCollection } from "@/lib/drafts/files"

interface DraftFileNavigatorProps {
  files: DraftFileCollection["files"]
  activeFileId: string
  activeFile: { content: string; filePath: string }
  unsavedFileIds: Set<string>
  onSelectFile: (fileId: string) => void
  onRemoveFile: (fileId: string) => void
  isReadOnly: boolean
  activeFileHasDuplicatePath: boolean
  duplicateFilePaths: string[]
  onOpenFileDialog: (kind: "add" | "replace", mode: SourceMode) => void
  onSetInsertDialogIntent: (value: boolean) => void
}

export function DraftFileNavigator({
  files,
  activeFileId,
  activeFile,
  unsavedFileIds,
  onSelectFile,
  onRemoveFile,
  isReadOnly,
  activeFileHasDuplicatePath,
  duplicateFilePaths,
  onOpenFileDialog,
  onSetInsertDialogIntent,
}: DraftFileNavigatorProps) {
  const t = useTranslations("Editor")
  const fileT = useTranslations("DraftFiles")
  const [filePendingRemoval, setFilePendingRemoval] = React.useState<
    DraftFileCollection["files"][number] | null
  >(null)

  const requestFileRemoval = (file: DraftFileCollection["files"][number]) => {
    setFilePendingRemoval(file)
  }

  const fileRows = files.map((file, index) => {
    const segments = file.filePath.split("/").filter(Boolean)
    return {
      file,
      isActive: file.id === activeFileId,
      isUnsaved: unsavedFileIds.has(file.id),
      label: segments.at(-1) || `${t("untitledFile")} ${index + 1}`,
    }
  })

  return (
    <>
      <section className="border-tech-main/40 bg-surface-overlay/80 border backdrop-blur-sm">
        <div className="border-tech-main/30 bg-tech-main/3 flex min-h-14 items-center justify-between gap-3 border-b px-4 py-2 lg:hidden">
          <div>
            <p className="text-tech-main-dark text-sm font-medium">
              {t("filesLabel")}
            </p>
            <p className="text-tech-main/60 text-xs">
              {t("filesCount", { count: files.length })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isReadOnly}
              onClick={() => onOpenFileDialog("add", "repo")}>
              <PlusIcon aria-hidden className="size-3" />
              {fileT("addButton")}
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="secondary" size="sm">
                  {t("filesLabel")}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="border-tech-main/40 bg-surface-modal p-0">
                <SheetHeader className="border-tech-main/30 border-b">
                  <SheetTitle>{t("filesLabel")}</SheetTitle>
                </SheetHeader>
                <div className="space-y-1 overflow-y-auto p-2">
                  {fileRows.map(({ file, isActive, label }) => (
                    <SheetClose asChild key={file.id}>
                      <button
                        type="button"
                        onClick={() => onSelectFile(file.id)}
                        className={cn(
                          "focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2 flex min-h-11 w-full flex-col justify-center border-l-2 px-3 text-left",
                          isActive
                            ? "border-tech-signal bg-tech-main/5"
                            : "border-transparent"
                        )}>
                        <span className="text-tech-main-dark truncate text-sm font-medium">
                          {label}
                        </span>
                        <span className="text-tech-main/60 truncate font-mono text-[0.625rem]">
                          {file.filePath || t("targetFileUnset")}
                        </span>
                      </button>
                    </SheetClose>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)]">
          <nav
            aria-label={t("filesAria")}
            className="border-tech-main/30 hidden border-r lg:block">
            <div className="border-tech-main/30 bg-tech-main/3 flex min-h-14 items-center justify-between gap-3 border-b px-4 py-2">
              <div>
                <p className="text-tech-main-dark text-sm font-medium">
                  {t("filesLabel")}
                </p>
                <p className="text-tech-main/60 text-xs">
                  {t("filesCount", { count: files.length })}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isReadOnly}
                onClick={() => onOpenFileDialog("add", "repo")}>
                <PlusIcon aria-hidden className="size-3" />
                {fileT("addButton")}
              </Button>
            </div>
            <div className="max-h-125 space-y-1 overflow-y-auto p-2">
              {fileRows.map(({ file, isActive, isUnsaved, label }) => (
                <div
                  key={file.id}
                  className={cn(
                    "flex min-w-0 items-center gap-1 border-l-2",
                    isActive
                      ? "border-tech-signal bg-tech-main/5"
                      : "border-transparent"
                  )}>
                  <button
                    type="button"
                    onClick={() => onSelectFile(file.id)}
                    className="focus-visible:outline-tech-main flex min-h-11 min-w-0 flex-1 flex-col justify-center px-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2">
                    <span className="text-tech-main-dark flex min-w-0 items-center gap-2 text-sm font-medium">
                      <span
                        className={cn(
                          "size-1.5 shrink-0",
                          isUnsaved ? "bg-amber-600" : "bg-transparent"
                        )}
                      />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="text-tech-main/60 truncate pl-3.5 font-mono text-[0.625rem]">
                      {file.filePath || t("targetFileUnset")}
                    </span>
                  </button>
                  {!isReadOnly && files.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-tech-main/60 size-11 p-0 hover:text-red-600"
                      aria-label={fileT("removeFile")}
                      onClick={() => requestFileRemoval(file)}>
                      <Trash2Icon aria-hidden className="size-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </nav>

          <div className="min-w-0 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-tech-main/60 text-xs font-medium">
                  {t("activeFileLabel")}
                </p>
                <p className="text-tech-main-dark mt-1 font-mono text-sm break-all">
                  {activeFile.filePath || t("targetFileUnset")}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label={t("fileActionsAria")}
                    disabled={isReadOnly}>
                    <MoreHorizontalIcon aria-hidden className="size-4" />
                    {t("fileActions")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="border-tech-main/40 bg-surface-modal rounded-none">
                  <DropdownMenuItem
                    onSelect={() => onOpenFileDialog("replace", "repo")}>
                    {t("chooseExistingFile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onOpenFileDialog("replace", "new")}>
                    {t("createTargetFile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onOpenFileDialog("replace", "upload")}>
                    {t("importTargetFile")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => onOpenFileDialog("add", "folder")}>
                    {t("createFolder")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onSetInsertDialogIntent(true)}>
                    {t("insertFileLink")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {!activeFile.filePath && !isReadOnly ? (
              <output className="mt-4 block text-sm/relaxed text-amber-700">
                {t("filePathBlankHint")}
              </output>
            ) : null}
            {activeFileHasDuplicatePath ? (
              <p className="mt-4 text-sm/relaxed text-red-700" role="alert">
                {t("duplicatePathError")}
              </p>
            ) : null}
            {duplicateFilePaths.length > 0 ? (
              <p className="mt-4 text-sm/relaxed text-red-700" role="alert">
                {t("duplicatePathsError", {
                  paths: duplicateFilePaths.join(", "),
                })}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <Dialog
        open={filePendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setFilePendingRemoval(null)
        }}>
        <DialogContent className="border-tech-main/40 bg-surface-modal top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6">
          <DialogHeader>
            <DialogTitle>{fileT("removeFile")}</DialogTitle>
            <DialogDescription>
              {t("removeFileDescription", {
                file: filePendingRemoval?.filePath || t("targetFileUnset"),
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
              variant="danger"
              onClick={() => {
                if (filePendingRemoval) onRemoveFile(filePendingRemoval.id)
                setFilePendingRemoval(null)
              }}>
              {fileT("removeFileButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
