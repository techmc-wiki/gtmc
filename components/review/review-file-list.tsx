"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import { StatusDot } from "@/components/ui/status-dot"
import {
  FileListSidebar,
  FileListHeader,
  FileListContainer,
  FileListItem,
  FileListStatusBar,
  FileExtBadge,
} from "@/components/ui/file-list"

interface ReviewFileListProps {
  files: Array<{
    id: string
    filePath: string
    status: "clean" | "conflict" | "resolved"
    changeType?: "added" | "modified" | "removed" | "renamed"
    additions?: number
    deletions?: number
  }>
  activeFileId: string
  onSelectFile: (fileId: string) => void
}

function StatusIndicator({
  status,
}: {
  status: "clean" | "conflict" | "resolved"
}) {
  const t = useTranslations("Review")
  const variant =
    status === "conflict"
      ? "conflict"
      : status === "resolved"
        ? "resolved"
        : "clean"
  return (
    <span aria-label={t(status)}>
      <StatusDot variant={variant} size="md" />
    </span>
  )
}

export function ReviewFileList({
  files,
  activeFileId,
  onSelectFile,
}: ReviewFileListProps) {
  const t = useTranslations("Review")
  const conflictCount = files.filter((f) => f.status === "conflict").length
  const allClean = conflictCount === 0

  return (
    <FileListSidebar sticky className="border-tech-main/40 bg-tech-main/5">
      <FileListHeader
        title={`${t("fileListLabel")} [${files.length}]`}
        subtitle={t("selectFileToReview")}
      />

      <FileListStatusBar variant={allClean ? "success" : "error"}>
        {allClean
          ? t("allClean")
          : t("conflictsCount", { count: conflictCount })}
      </FileListStatusBar>

      <FileListContainer className="space-y-2">
        {files.map((file, index) => (
          <ReviewFileListItem
            key={file.id}
            file={file}
            index={index}
            isActive={file.id === activeFileId}
            onSelectFile={onSelectFile}
          />
        ))}
      </FileListContainer>
    </FileListSidebar>
  )
}

function ReviewFileListItem({
  file,
  index,
  isActive,
  onSelectFile,
}: {
  file: ReviewFileListProps["files"][number]
  index: number
  isActive: boolean
  onSelectFile: (fileId: string) => void
}) {
  const primaryAction = React.useMemo(
    () => (
      <span className="flex shrink-0 items-center gap-1.5">
        <FileExtBadge filePath={file.filePath} />
        <StatusIndicator status={file.status} />
      </span>
    ),
    [file.filePath, file.status]
  )

  return (
    <FileListItem
      fileId={file.id}
      filePath={file.filePath}
      index={index}
      isActive={isActive}
      onSelect={onSelectFile}
      primaryAction={primaryAction}
      className="ml-0">
      <span className="text-tech-main/45 flex w-full flex-wrap items-center gap-2 font-mono text-[0.625rem] tracking-widest uppercase">
        <span>{file.changeType ?? "modified"}</span>
        <span>+{file.additions ?? 0}</span>
        <span>-{file.deletions ?? 0}</span>
      </span>
    </FileListItem>
  )
}
