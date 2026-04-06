"use client"

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
  if (status === "conflict") {
    return (
      <span
        role="img"
        title="Conflict"
        className="w-2 h-2 rounded-full bg-red-500 shrink-0"
      />
    )
  }
  if (status === "resolved") {
    return (
      <span
        role="img"
        title="Resolved"
        className="w-2 h-2 rounded-full bg-green-500 shrink-0"
      />
    )
  }
  return (
    <span
      role="img"
      title="Clean"
      className="w-2 h-2 rounded-full bg-tech-main/20 shrink-0"
    />
  )
}

export function ReviewFileList({
  files,
  activeFileId,
  onSelectFile,
}: ReviewFileListProps) {
  return (
    <aside className="border border-tech-main/40 bg-tech-main/5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-tech-main/30 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs tracking-widest text-tech-main uppercase">
            REVIEW_FILES_[{files.length}]
          </p>
          <p
            className="truncate font-mono text-[0.6875rem] text-tech-main/60 uppercase"
            title="SELECT_FILE_TO_REVIEW">
            SELECT_FILE_TO_REVIEW
          </p>
        </div>
      </div>

      <div className="space-y-2 p-2">
        {files.map((file, index) => {
          const fileLabel =
            file.filePath.split("/").filter(Boolean).at(-1) ||
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
                  <StatusIndicator status={file.status} />
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
