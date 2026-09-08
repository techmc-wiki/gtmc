"use client"

import * as React from "react"
import {
  FileTextIcon,
  PanelLeftIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
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
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/shadcn/sheet"
import { EditorIconButton } from "@/components/editor/editor-icon-button"
import { Input } from "@/components/ui/shadcn/input"
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

  const [sidebarVisible, setSidebarVisible] = React.useState(true)
  const [filesOpen, setFilesOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [renaming, setRenaming] = React.useState(false)
  const [path, setPath] = React.useState("")
  const visibleFiles = fileRows.filter(({ file, label }) =>
    `${file.filePath} ${label}`.toLowerCase().includes(search.toLowerCase())
  )
  const fileList = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-1 p-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-tech-main-dark text-sm font-semibold">
            {t("filesLabel")}
          </h2>
          <div className="flex items-center gap-1">
            <span className="text-tech-main text-xs">{files.length}</span>{" "}
            <EditorIconButton
              label={fileT("addButton")}
              disabled={isReadOnly}
              onClick={() => {
                setFilesOpen(false)
                onOpenFileDialog("add", "new")
              }}>
              <PlusIcon aria-hidden className="size-4" />
            </EditorIconButton>
          </div>
        </div>
        <Input
          aria-label={t("searchFiles")}
          placeholder={t("searchFiles")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="hover:border-tech-main/20 focus:border-tech-main min-h-11 border-transparent bg-transparent px-2 font-sans text-sm shadow-none"
        />
      </div>
      <nav
        aria-label={t("filesAria")}
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {visibleFiles.map(({ file, isActive, isUnsaved, label }) => (
          <Button
            key={file.id}
            variant="ghost"
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              onSelectFile(file.id)
              setFilesOpen(false)
            }}
            title={file.filePath || label}
            className={cn(
              "mb-0.5 h-auto min-h-11 w-full justify-start gap-2 border-0 border-l-2 px-2 py-1.5 text-left font-sans tracking-normal normal-case",
              isActive
                ? "border-tech-signal bg-tech-main/5"
                : "border-transparent"
            )}>
            <FileTextIcon aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {label}
              </span>
              <span className="text-tech-main/70 block truncate text-[11px] font-normal">
                {file.filePath.split("/").slice(0, -1).join("/")}
              </span>
            </span>
            {isUnsaved && (
              <span className="size-1.5 shrink-0 bg-amber-600">
                <span className="sr-only">{t("unsavedLabel")}</span>
              </span>
            )}
          </Button>
        ))}
        {visibleFiles.length === 0 && (
          <p className="text-tech-main p-3 text-sm">{t("noMatchingFiles")}</p>
        )}
      </nav>
    </div>
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
            <EditorIconButton
              label={sidebarVisible ? t("hideFiles") : t("showFiles")}
              className="hidden lg:flex"
              aria-expanded={sidebarVisible}
              onClick={() => setSidebarVisible((value) => !value)}>
              <PanelLeftIcon aria-hidden />
            </EditorIconButton>
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
              <EditorIconButton
                label={t("setFilePath")}
                onClick={() => {
                  setPath(activeFile.filePath)
                  setRenaming(true)
                }}>
                <FileTextIcon aria-hidden />
              </EditorIconButton>
            )}
            {headerActions}
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
                <DropdownMenuItem
                  onSelect={() => {
                    setPath(activeFile.filePath)
                    setRenaming(true)
                  }}>
                  {t("renameFile")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onSetInsertDialogIntent(true)}>
                  {t("insertFileLink")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onOpenFileDialog("add", "folder")}>
                  {t("createFolder")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => onOpenFileDialog("replace", "repo")}>
                  {t("chooseExistingFile")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onOpenFileDialog("replace", "upload")}>
                  {t("importTargetFile")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={files.length <= 1}
                  onSelect={() => {
                    const file = files.find((item) => item.id === activeFileId)
                    if (file) requestFileRemoval(file)
                  }}
                  className="text-red-700 dark:text-red-400">
                  <Trash2Icon aria-hidden className="size-4" />
                  {fileT("removeFile")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {activeFileHasDuplicatePath || duplicateFilePaths.length > 0 ? (
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
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="bg-surface-modal top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 p-6">
          <DialogHeader>
            <DialogTitle>{t("renameFile")}</DialogTitle>
            <DialogDescription>{t("renameFileHint")}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (onRenameFile(path)) setRenaming(false)
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRenaming(false)}>
                {t("cancelButton")}
              </Button>
              <Button type="submit" disabled={!path.trim()}>
                {t("applyFilePath")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
