"use client"

import { useTranslations } from "next-intl"

interface ReviewFileListProps {
  files: Array<{
    id: string
    filePath: string
    status: "clean" | "conflict" | "resolved"
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
  if (status === "conflict") {
    return (
      <span
        role="img"
        title={t("conflict")}
        className="size-2 shrink-0 bg-red-500"
      />
    )
  }
  if (status === "resolved") {
    return (
      <span
        role="img"
        title={t("resolved")}
        className="size-2 shrink-0 bg-green-500"
      />
    )
  }
  return (
    <span
      role="img"
      title={t("clean")}
      className="size-2 shrink-0 bg-tech-main/20"
    />
  )
}

function FileExtBadge({ filePath }: { filePath: string }) {
  const ext = filePath.includes(".")
    ? filePath.slice(filePath.lastIndexOf("."))
    : null
  if (!ext) return null
  return (
    <span className="shrink-0 kbd-badge bg-tech-main/5 font-mono text-[0.5625rem] tracking-widest text-tech-main/50 uppercase">
      {ext}
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
    <aside className="sticky top-16 md:top-20 self-start max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto border border-tech-main/40 bg-tech-main/5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-tech-main/30 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs tracking-widest text-tech-main uppercase">
            {t("fileListLabel")} [{files.length}]
          </p>
          <p
            className="truncate font-mono text-[0.6875rem] text-tech-main/60 uppercase"
            title={t("selectFileToReview")}>
            {t("selectFileToReview")}
          </p>
        </div>
      </div>

      <div
        className={`border-b px-4 py-2 ${
          allClean
            ? "border-green-500/20 bg-green-500/5"
            : "border-red-500/20 bg-red-500/5"
        }`}>
        <span
          className={`font-mono text-[0.6875rem] tracking-widest uppercase ${
            allClean ? "text-green-700" : "text-red-600"
          }`}>
          {allClean
            ? t("allClean")
            : t("conflictsCount", { count: conflictCount })}
        </span>
      </div>

      <div className="space-y-2 p-2">
        {files.map((file, index) => {
          const pathSegments = file.filePath.split("/").filter(Boolean)
          const fileLabel =
            pathSegments[pathSegments.length - 1] ||
            `UNTITLED_FILE_${index + 1}`
          const isActive = file.id === activeFileId

          return (
            <div key={file.id} className="relative flex items-stretch">
              <button
                type="button"
                onClick={() => onSelectFile(file.id)}
                className={`
                  flex min-h-11 min-w-0 flex-1 flex-col items-start gap-1 border
                  px-3 py-2 text-left transition-colors
                  ${
                    isActive
                      ? `border-tech-main bg-tech-main/10`
                      : `guide-line bg-white/70 hover:border-tech-main/50 hover:bg-white/90`
                  }
                `}>
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs tracking-widest text-tech-main uppercase">
                    {fileLabel}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <FileExtBadge filePath={file.filePath} />
                    <StatusIndicator status={file.status} />
                  </span>
                </span>
                <span className="w-full truncate font-mono text-[0.6875rem] text-tech-main/60">
                  {file.filePath || "PATH_NOT_SET"}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
