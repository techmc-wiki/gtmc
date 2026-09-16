"use client"

import { FileTextIcon, PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/shadcn/button"
import { IconButton } from "@/components/ui/icon-button"
import { Input } from "@/components/ui/shadcn/input"
import { cn } from "@/lib/cn"
import type { DraftFileCollection } from "@/lib/drafts/files"

interface DraftFileListProps {
  files: DraftFileCollection["files"]
  activeFileId: string
  unsavedFileIds: Set<string>
  search: string
  onSearchChange: (value: string) => void
  isReadOnly: boolean
  onSelectFile: (fileId: string) => void
  onRequestAddFile: () => void
}

/** Searchable file list, shared by the desktop sidebar and the mobile sheet. */
export function DraftFileList({
  files,
  activeFileId,
  unsavedFileIds,
  search,
  onSearchChange,
  isReadOnly,
  onSelectFile,
  onRequestAddFile,
}: DraftFileListProps) {
  const t = useTranslations("Editor")
  const fileT = useTranslations("DraftFiles")

  const fileRows = files.map((file, index) => {
    const segments = file.filePath.split("/").filter(Boolean)
    return {
      file,
      isActive: file.id === activeFileId,
      isUnsaved: unsavedFileIds.has(file.id),
      label: segments.at(-1) || `${t("untitledFile")} ${index + 1}`,
    }
  })

  const query = search.toLowerCase()
  const visibleFiles = fileRows.filter(({ file, label }) =>
    `${file.filePath} ${label}`.toLowerCase().includes(query)
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-1 p-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-tech-main-dark text-sm font-semibold">
            {t("filesLabel")}
          </h2>
          <div className="flex items-center gap-1">
            <span className="text-tech-main text-xs">{files.length}</span>{" "}
            <IconButton
              label={fileT("addButton")}
              disabled={isReadOnly}
              onClick={onRequestAddFile}>
              <PlusIcon aria-hidden className="size-4" />
            </IconButton>
          </div>
        </div>
        <Input
          aria-label={t("searchFiles")}
          placeholder={t("searchFiles")}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
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
            onClick={() => onSelectFile(file.id)}
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
}
