"use client"

import * as React from "react"
import { FileTextIcon, PanelLeftIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import type { SourceMode } from "@/components/editor/draft-file-source-dialog"
import { Button } from "@/components/ui/shadcn/button"
import { DraftFileActionsMenu } from "@/components/editor/draft-file-actions-menu"
import { DraftFileList } from "@/components/editor/draft-file-list"
import { DraftFileRemoveDialog } from "@/components/editor/draft-file-remove-dialog"
import { DraftFileRenameDialog } from "@/components/editor/draft-file-rename-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/shadcn/sheet"
import { IconButton } from "@/components/ui/icon-button"
import { cn } from "@/lib/cn"
import type { DraftFileCollection } from "@/lib/drafts/files"

interface DraftFileNavigatorProps {
  headerActions: React.ReactNode
  children: React.ReactNode
  onRenameFile: (path: string) => boolean
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
  headerActions,
  children,
  onRenameFile,
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
  const [sidebarVisible, setSidebarVisible] = React.useState(true)
  const [filesOpen, setFilesOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [renaming, setRenaming] = React.useState(false)
  const [filePendingRemoval, setFilePendingRemoval] = React.useState<
    DraftFileCollection["files"][number] | null
  >(null)
  const hasDuplicatePaths =
    activeFileHasDuplicatePath || duplicateFilePaths.length > 0

  const fileList = (
    <DraftFileList
      files={files}
      activeFileId={activeFileId}
      unsavedFileIds={unsavedFileIds}
      search={search}
      onSearchChange={setSearch}
      isReadOnly={isReadOnly}
      onSelectFile={(fileId) => {
        onSelectFile(fileId)
        setFilesOpen(false)
      }}
      onRequestAddFile={() => {
        setFilesOpen(false)
        onOpenFileDialog("add", "new")
      }}
    />
  )

  return (
    <>
      <div
        className={cn(
          "grid min-w-0",
          sidebarVisible && "lg:grid-cols-[13rem_minmax(0,1fr)]"
        )}>
        <aside
          className={cn(
            "bg-tech-bg/50 border-tech-main/15 hidden min-h-0 border-r",
            sidebarVisible && "lg:flex lg:flex-col"
          )}>
          {fileList}
        </aside>
        <div className="bg-surface min-w-0">
          <div className="border-tech-main/15 flex min-h-12 items-center gap-1 border-b px-2">
            <IconButton
              label={sidebarVisible ? t("hideFiles") : t("showFiles")}
              className="hidden lg:flex"
              aria-expanded={sidebarVisible}
              onClick={() => setSidebarVisible((value) => !value)}>
              <PanelLeftIcon aria-hidden />
            </IconButton>
            <Sheet open={filesOpen} onOpenChange={setFilesOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11 lg:hidden"
                  aria-label={t("filesLabel")}>
                  <PanelLeftIcon aria-hidden className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="bg-surface-modal w-[85vw] p-0"
                aria-describedby={undefined}>
                <SheetHeader className="p-0">
                  <SheetTitle className="sr-only">{t("filesLabel")}</SheetTitle>
                </SheetHeader>
                {fileList}
              </SheetContent>
            </Sheet>

            <p
              className="text-tech-main-dark min-w-0 flex-1 truncate text-sm"
              title={activeFile.filePath}>
              {activeFile.filePath || t("targetFileUnset")}
            </p>
            {!activeFile.filePath && !isReadOnly && (
              <IconButton
                label={t("setFilePath")}
                onClick={() => setRenaming(true)}>
                <FileTextIcon aria-hidden />
              </IconButton>
            )}
            {headerActions}
            <DraftFileActionsMenu
              isReadOnly={isReadOnly}
              canRemove={files.length > 1}
              onRequestRename={() => setRenaming(true)}
              onInsertFileLink={() => onSetInsertDialogIntent(true)}
              onOpenFileDialog={onOpenFileDialog}
              onRequestRemove={() => {
                const file = files.find((item) => item.id === activeFileId)
                if (file) setFilePendingRemoval(file)
              }}
            />
          </div>
          {hasDuplicatePaths ? (
            <p
              className="border-b border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
              role="alert">
              {t("duplicatePathsError", {
                paths: duplicateFilePaths.join(", "),
              })}
            </p>
          ) : null}
          {children}
        </div>
      </div>
      <DraftFileRenameDialog
        open={renaming}
        initialPath={activeFile.filePath}
        onOpenChange={setRenaming}
        onSubmit={onRenameFile}
      />
      <DraftFileRemoveDialog
        file={filePendingRemoval}
        onOpenChange={(open) => {
          if (!open) setFilePendingRemoval(null)
        }}
        onConfirm={onRemoveFile}
      />
    </>
  )
}
