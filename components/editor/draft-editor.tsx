"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"

import { saveDraftAction, submitForReviewAction } from "@/actions/article"
import { DraftFileSourceDialog } from "@/components/editor/draft-file-source-dialog"
import {
  createDraftFile,
  getActiveDraftFile,
  getDuplicateDraftFilePaths,
  normalizeDraftFileCollection,
  normalizeDraftFilePath,
  serializeDraftFilesPayload,
  type DraftFileCollection,
} from "@/lib/draft-files"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import {
  LoadingIndicator,
  PENDING_LABELS,
} from "@/components/ui/loading-indicator"
import { BrutalButton } from "../ui/brutal-button"
import { BrutalInput } from "../ui/brutal-input"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { useEditorUpload } from "@/hooks/use-editor-upload"

const MarkdownPreview = dynamic(
  () =>
    import("@/components/editor/markdown-preview").then(
      (mod) => mod.MarkdownPreview
    ),
  {
    ssr: false,
    loading: () => <p className="editor-panel">LOADING_PREVIEW_</p>,
  }
)

interface DraftEditorProps {
  initialData?: {
    activeFileId?: string
    id?: string
    articleId?: string
    githubPrUrl?: string
    files: DraftFileCollection["files"]
    title: string
    status?: string
  }
}

type BadgeType = "info" | "error" | "progress"

export function DraftEditor({ initialData }: DraftEditorProps) {
  const router = useRouter()
  const initialStatus = initialData?.status || "DRAFT"

  const [draftStatus, setDraftStatus] = React.useState(initialStatus)
  const [title, setTitle] = React.useState(initialData?.title || "")
  const [draftCollection, setDraftCollection] = React.useState(() =>
    normalizeDraftFileCollection({
      activeFileId: initialData?.activeFileId,
      files:
        initialData?.files && initialData.files.length > 0
          ? initialData.files
          : [createDraftFile()],
    })
  )
  const [revisionId, setRevisionId] = React.useState<string | undefined>(
    initialData?.id
  )
  const [isAddFileDialogOpen, setIsAddFileDialogOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">("write")
  const [badge, setBadge] = React.useState<{
    message: string
    type: BadgeType
  } | null>(null)

  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const badgeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const articleId = initialData?.articleId
  const githubPrUrl = initialData?.githubPrUrl
  const isSyncConflict = draftStatus === "SYNC_CONFLICT"
  const isReadOnly =
    draftStatus === "IN_REVIEW" || draftStatus === "SYNC_CONFLICT"
  const activeFile = getActiveDraftFile(draftCollection)
  const activeFileContent =
    isSyncConflict && activeFile.conflictContent !== undefined
      ? activeFile.conflictContent || ""
      : activeFile.content
  const duplicateFilePaths = getDuplicateDraftFilePaths(draftCollection.files)
  const hasMissingFilePath = draftCollection.files.some(
    (file) => !file.filePath
  )
  const activeFileHasDuplicatePath = duplicateFilePaths.some(
    (filePath) =>
      normalizeDraftFilePath(filePath) ===
      normalizeDraftFilePath(activeFile.filePath)
  )
  const activeFileIndex =
    draftCollection.files.findIndex((file) => file.id === activeFile.id) + 1

  const showBadge = (
    message: string,
    type: BadgeType,
    autoClearMs?: number
  ) => {
    if (badgeTimeoutRef.current) {
      clearTimeout(badgeTimeoutRef.current)
    }

    setBadge({ message, type })

    if (autoClearMs) {
      badgeTimeoutRef.current = setTimeout(() => {
        setBadge(null)
      }, autoClearMs)
    }
  }

  const clearBadge = () => {
    if (badgeTimeoutRef.current) {
      clearTimeout(badgeTimeoutRef.current)
    }

    setBadge(null)
  }

  React.useEffect(() => {
    return () => {
      if (badgeTimeoutRef.current) {
        clearTimeout(badgeTimeoutRef.current)
      }
    }
  }, [])

  const updateDraftCollection = (
    updater: (current: DraftFileCollection) => DraftFileCollection
  ) => {
    setDraftCollection((current) =>
      normalizeDraftFileCollection(updater(current))
    )
  }

  const updateFileById = (
    fileId: string,
    updates: {
      content?: string
      filePath?: string
      conflictContent?: string | null
    }
  ) => {
    updateDraftCollection((current) => ({
      ...current,
      files: current.files.map((file) =>
        file.id === fileId
          ? {
              ...file,
              ...(updates.content !== undefined
                ? { content: updates.content }
                : {}),
              ...(updates.filePath !== undefined
                ? { filePath: normalizeDraftFilePath(updates.filePath) }
                : {}),
              ...(updates.conflictContent !== undefined
                ? { conflictContent: updates.conflictContent }
                : {}),
            }
          : file
      ),
    }))
  }

  const updateActiveFile = (updates: {
    content?: string
    filePath?: string
  }) => {
    updateFileById(draftCollection.activeFileId, updates)
  }

  const insertTextAtCursor = (text: string) => {
    if (!textareaRef.current) {
      return
    }

    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd

    updateActiveFile({
      content:
        activeFileContent.substring(0, start) +
        text +
        activeFileContent.substring(end),
    })

    setTimeout(() => {
      if (textareaRef.current) {
        const cursor = start + text.length
        textareaRef.current.focus()
        textareaRef.current.selectionStart = cursor
        textareaRef.current.selectionEnd = cursor
      }
    }, 0)
  }

  const insertSyntax = (prefix: string, suffix: string = "") => {
    if (isReadOnly || !textareaRef.current) return
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const selectedText = activeFileContent.substring(start, end)
    const newText = prefix + selectedText + suffix

    updateActiveFile({
      content:
        activeFileContent.substring(0, start) +
        newText +
        activeFileContent.substring(end),
    })

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.selectionStart = start + prefix.length
        textareaRef.current.selectionEnd =
          start + prefix.length + selectedText.length
      }
    }, 0)
  }

  const draftUploadAdapter = React.useCallback(
    async (file: File) => {
      if (!revisionId) {
        throw new Error("Save draft first before uploading files.")
      }

      const formData = new FormData()
      formData.append("file", file)
      formData.append("revisionId", revisionId)

      const res = await fetch("/api/upload/draft", {
        method: "POST",
        body: formData,
      })

      if (res.status === 413) {
        throw new Error("File too large for upload.")
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")

      return {
        url: data.url,
        filename: data.filename,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
      }
    },
    [revisionId]
  )

  const { uploadFile, isUploading, isCompressing } = useEditorUpload({
    adapter: draftUploadAdapter,
    onInsertContent: (text: string) => {
      if (text === "") {
        updateActiveFile({
          content: activeFileContent.replace(
            /<!-- UPLOAD_PENDING_[a-f0-9-]+ -->\n?/g,
            ""
          ),
        })
      } else if (text.startsWith("<!--")) {
        insertTextAtCursor(text)
      } else {
        updateActiveFile({
          content: activeFileContent.replace(
            /<!-- UPLOAD_PENDING_[a-f0-9-]+ -->/,
            text
          ),
        })
      }
    },
    onShowBadge: (message: string, type: "info" | "error" | "progress") => {
      showBadge(message, type)
    },
    onClearBadge: clearBadge,
  })

  const handleUploadWithAutoSave = async (file: File) => {
    if (!revisionId) {
      showBadge("SAVING_DRAFT_BEFORE_UPLOAD...", "progress")
      setIsSaving(true)
      try {
        const normalizedDraftCollection =
          normalizeDraftFileCollection(draftCollection)
        const primaryFile = getActiveDraftFile(normalizedDraftCollection)
        const formData = new FormData()
        formData.append("title", title)
        formData.append("activeFileId", normalizedDraftCollection.activeFileId)
        formData.append("content", primaryFile.content)
        formData.append(
          "draftFiles",
          serializeDraftFilesPayload(normalizedDraftCollection)
        )
        formData.append("filePath", primaryFile.filePath)
        if (articleId) formData.append("articleId", articleId)

        const result = await saveDraftAction(formData)
        if (result.success && result.revisionId) {
          setDraftCollection(normalizedDraftCollection)
          setRevisionId(result.revisionId)
          clearBadge()
        } else {
          showBadge("SAVE_FAILED_ Cannot upload without saved draft.", "error")
          return
        }
      } catch {
        showBadge("SAVE_FAILED_ Cannot upload without saved draft.", "error")
        return
      } finally {
        setIsSaving(false)
      }
    }
    uploadFile(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (isReadOnly || isUploading) return
    const items = e.clipboardData.items
    for (const item of Array.from(items)) {
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          handleUploadWithAutoSave(file)
        }
        break
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    if (isReadOnly || isUploading) return
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      handleUploadWithAutoSave(file)
    }
  }

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const normalizedDraftCollection =
        normalizeDraftFileCollection(draftCollection)
      const primaryFile = getActiveDraftFile(normalizedDraftCollection)
      const formData = new FormData()
      formData.append("title", title)
      formData.append("activeFileId", normalizedDraftCollection.activeFileId)
      formData.append("content", primaryFile.content)
      formData.append(
        "draftFiles",
        serializeDraftFilesPayload(normalizedDraftCollection)
      )
      formData.append("filePath", primaryFile.filePath)
      if (revisionId) formData.append("revisionId", revisionId)
      if (articleId) formData.append("articleId", articleId)

      const result = await saveDraftAction(formData)
      if (result.success && result.revisionId) {
        setDraftCollection(normalizedDraftCollection)
        setRevisionId(result.revisionId)
        alert("草稿已保存 / Draft Saved!")
      }
    } catch (error) {
      console.error(error)
      alert("保存失败 / Save Failed")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!revisionId) {
      alert("请先保存草稿 / Please save draft first")
      return
    }

    if (hasMissingFilePath) {
      alert("请先为所有文件填写路径 / Every file needs a path before review")
      return
    }

    if (duplicateFilePaths.length > 0) {
      alert(
        `存在重复文件路径 / Duplicate file paths: ${duplicateFilePaths.join(", ")}`
      )
      return
    }

    setIsSubmittingReview(true)
    try {
      const result = await submitForReviewAction(revisionId)
      setDraftStatus(result.status)
      alert(
        result.status === "SYNC_CONFLICT"
          ? "检测到与最新 main 的冲突，请继续解决 / Sync conflict detected. Please resolve it."
          : "已开启 PR 并进入审核 / PR opened successfully."
      )
      router.push(`/draft/${revisionId}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert("提交审核失败 / Submit Failed")
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const handleAddFile = () => {
    if (isReadOnly) {
      return
    }

    const lastSlashIndex = activeFile.filePath.lastIndexOf("/")
    const suggestedPath =
      lastSlashIndex >= 0
        ? activeFile.filePath.slice(0, lastSlashIndex + 1)
        : ""
    const nextFile = createDraftFile({ filePath: suggestedPath })

    updateDraftCollection((current) => ({
      activeFileId: nextFile.id,
      files: [...current.files, nextFile],
    }))
  }

  const handleRemoveFile = (fileId: string) => {
    if (isReadOnly || draftCollection.files.length <= 1) {
      return
    }

    updateDraftCollection((current) => {
      const currentIndex = current.files.findIndex((file) => file.id === fileId)
      const remainingFiles = current.files.filter((file) => file.id !== fileId)
      const nextActiveFile =
        current.activeFileId === fileId
          ? remainingFiles[Math.max(0, currentIndex - 1)]?.id ||
            remainingFiles[0]?.id
          : current.activeFileId

      return {
        activeFileId: nextActiveFile,
        files: remainingFiles,
      }
    })
  }

  const handleCreateDraftFile = ({
    content,
    filePath,
  }: {
    content: string
    filePath: string
  }) => {
    const normalizedPath = normalizeDraftFilePath(filePath)
    const hasDuplicate = draftCollection.files.some(
      (file) => normalizeDraftFilePath(file.filePath) === normalizedPath
    )

    if (hasDuplicate) {
      alert("该文件已在当前草稿中存在 / File already exists in this draft")
      return false
    }

    const nextFile = createDraftFile({
      content,
      filePath: normalizedPath,
    })

    updateDraftCollection((current) => ({
      activeFileId: nextFile.id,
      files: [...current.files, nextFile],
    }))
    setActiveTab("write")
    setIsAddFileDialogOpen(false)
    return true
  }

  const saveDisabled = isSaving || !title.trim()
  const submitDisabled =
    isSubmittingReview ||
    isSaving ||
    isUploading ||
    !title.trim() ||
    !revisionId ||
    hasMissingFilePath ||
    duplicateFilePaths.length > 0

  return (
    <form
      onSubmit={handleSaveDraft}
      className="
        group relative flex w-full flex-col space-y-6 border border-tech-main
        bg-white/80 p-4 backdrop-blur-sm
        sm:p-6
      ">
      <CornerBrackets />

      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <label htmlFor="draft-title" className="section-label">
            TITLE_
          </label>
          <BrutalInput
            id="draft-title"
            required
            placeholder="ENTER TITLE..."
            className={`
              border-tech-main/40 py-3 font-mono text-lg backdrop-blur-sm
              focus:border-tech-main/60
              ${
                isReadOnly
                  ? `cursor-not-allowed bg-gray-100 opacity-70`
                  : `bg-white/80`
              }
            `}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={isReadOnly}
            aria-busy={isSaving}
          />
        </div>
      </div>

      {githubPrUrl ? (
        <div
          className="
            flex items-center justify-between gap-3 border guide-line
            bg-tech-main/5 px-4 py-3 font-mono text-xs text-tech-main
          ">
          <span>PR_STREAM_ACTIVE</span>
          <a
            href={githubPrUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4">
            OPEN_GITHUB_PR
          </a>
        </div>
      ) : null}

      {isSyncConflict ? (
        <div
          className="
            border-l-4 border-amber-500 bg-amber-500/10 p-4 text-amber-700
          ">
          <p className="font-bold tracking-widest uppercase">
            Admin Resolution Pending
          </p>
          <p className="text-sm">
            This PR is blocked by a sync conflict. Only an admin can resolve it
            from the review page.
          </p>
        </div>
      ) : null}

      <div
        className="
          grid gap-4
          lg:grid-cols-[18rem_minmax(0,1fr)]
        ">
        <aside
          className="
          border border-tech-main/40 bg-tech-main/5 backdrop-blur-sm
        ">
          <div
            className="
              flex items-center justify-between gap-3 border-b
              border-tech-main/30 px-4 py-3
            ">
            <div className="min-w-0 flex-1">
              <p
                className="
                  font-mono text-xs tracking-widest text-tech-main uppercase
                ">
                FILES_[{draftCollection.files.length}]
              </p>
              <p
                className="
                  truncate font-mono text-[11px] text-tech-main/60 uppercase
                "
                title="SAVE_AND_REVIEW_APPLY_TO_ALL_FILES">
                SAVE_AND_REVIEW_APPLY_TO_ALL_FILES
              </p>
            </div>
            {!isReadOnly ? (
              <BrutalButton
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={handleAddFile}>
                + ADD
              </BrutalButton>
            ) : null}
          </div>

          <div className="space-y-2 p-2">
            {draftCollection.files.map((file, index) => {
              const fileLabel =
                file.filePath.split("/").filter(Boolean).at(-1) ||
                `UNTITLED_FILE_${index + 1}`
              const isActive = file.id === draftCollection.activeFileId

              return (
                <div key={file.id} className="relative flex items-stretch">
                  <button
                    type="button"
                    onClick={() =>
                      setDraftCollection((current) => ({
                        ...current,
                        activeFileId: file.id,
                      }))
                    }
                    className={`
                      flex min-h-11 min-w-0 flex-1 flex-col items-start gap-1
                      border px-3 py-2 text-left transition-colors
                      ${
                        isActive
                          ? `border-tech-main bg-tech-main/10`
                          : `
                            guide-line bg-white/70
                            hover:border-tech-main/50 hover:bg-white/90
                          `
                      }
                    `}>
                    <span
                      className="
                        w-full truncate font-mono text-xs tracking-widest
                        text-tech-main uppercase
                      ">
                      {fileLabel}
                    </span>
                    <span
                      className="
                        w-full truncate font-mono text-[11px] text-tech-main/60
                      ">
                      {file.filePath || "PATH_NOT_SET"}
                    </span>
                  </button>

                  {!isReadOnly && draftCollection.files.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      title="Remove file"
                      className={`
                        flex min-w-8 shrink-0 items-center justify-center
                        border-y border-r transition-colors
                        ${
                          isActive
                            ? `
                              border-tech-main bg-tech-main/5 text-tech-main/60
                              hover:border-red-500/30 hover:bg-red-500/10
                              hover:text-red-500
                            `
                            : `
                              guide-line bg-white/50 text-tech-main/40
                              hover:border-red-500/30 hover:bg-red-500/10
                              hover:text-red-500
                            `
                        }
                      `}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                        aria-label="Remove file">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </aside>

        <div className="space-y-4">
          <div
            className="
              border border-tech-main/40 bg-white/80 p-4 backdrop-blur-sm
            ">
            <div
              className="
                mb-4 flex flex-col gap-2
                sm:flex-row sm:items-end sm:justify-between
              ">
              <div>
                <p className="section-label">ACTIVE_FILE_</p>
                <p
                  className="
                    font-mono text-xs tracking-widest text-tech-main/70
                    uppercase
                  ">
                  SLOT_{activeFileIndex}/{draftCollection.files.length}
                </p>
              </div>
              <p className="font-mono text-[11px] text-tech-main/60 uppercase">
                {articleId ? "LIVE_ARTICLE_CONTEXT" : "DIRECT_REPO_EDIT"}
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="draft-file-path" className="section-label">
                FILE_PATH_
              </label>
              <BrutalInput
                id="draft-file-path"
                placeholder="e.g. SlimeTech/Molforte/04-new-machine.md"
                className={`
                  border-tech-main/40 py-2 font-mono text-sm backdrop-blur-sm
                  focus:border-tech-main/60
                  ${
                    isReadOnly
                      ? `cursor-not-allowed bg-gray-100 opacity-70`
                      : `bg-white/80`
                  }
                  ${activeFileHasDuplicatePath ? `border-red-500/60` : ``}
                `}
                value={activeFile.filePath}
                onChange={(e) => updateActiveFile({ filePath: e.target.value })}
                readOnly={isReadOnly}
                aria-busy={isSaving}
              />
            </div>

            {activeFileHasDuplicatePath ? (
              <p className="mt-3 font-mono text-xs text-red-500">
                Duplicate file path detected in this draft.
              </p>
            ) : null}

            {!activeFile.filePath && !isReadOnly ? (
              <p className="mt-3 font-mono text-xs text-amber-700">
                File path can be left blank while drafting, but every file needs
                a path before opening a PR.
              </p>
            ) : null}

            {duplicateFilePaths.length > 0 ? (
              <p className="mt-2 font-mono text-xs text-red-500">
                Duplicate paths: {duplicateFilePaths.join(", ")}
              </p>
            ) : null}
          </div>

          <div
            className="
              relative editor-grow flex min-h-125 grow flex-col border
              border-tech-main/40 bg-white/80 backdrop-blur-sm
            ">
            <div
              role="tablist"
              aria-label="Editor mode"
              className="
                flex items-center justify-between gap-3 border-b
                border-tech-main/40 bg-tech-main/10 font-mono text-xs
              ">
              <div className="flex items-center">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "write"}
                  aria-controls="draft-editor-write-panel"
                  onClick={() => setActiveTab("write")}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") setActiveTab("preview")
                  }}
                  className={`
                    px-4 py-2 transition-colors select-none
                    ${
                      activeTab === "write"
                        ? `bg-tech-main text-white`
                        : `
                          cursor-pointer text-tech-main/60
                          hover:bg-tech-main/10
                        `
                    }
                  `}>
                  WRITE_
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "preview"}
                  aria-controls="draft-editor-preview-panel"
                  onClick={() => setActiveTab("preview")}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") setActiveTab("write")
                  }}
                  className={`
                    px-4 py-2 transition-colors select-none
                    ${
                      activeTab === "preview"
                        ? `bg-tech-main text-white`
                        : `
                          cursor-pointer text-tech-main/60
                          hover:bg-tech-main/10
                        `
                    }
                  `}>
                  PREVIEW_
                </button>
              </div>

              <div className="pr-4 text-tech-main/60 uppercase">
                {activeFile.filePath || `UNTITLED_FILE_${activeFileIndex}`}
              </div>
            </div>

            {activeTab === "write" && (
              <>
                <EditorToolbar
                  onInsert={insertSyntax}
                  disabled={isReadOnly || isUploading}
                  fileUploadSlot={
                    !isReadOnly ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`
                          h-11 min-w-11 flex-1 border border-transparent px-3
                          transition-colors select-none
                          hover:border-white/20 hover:bg-tech-accent/20
                          sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5
                          ${isUploading ? "" : "cursor-pointer"}
                        `}
                        aria-busy={isUploading}>
                        {isCompressing ? "CMP" : isUploading ? "UPL" : "FILES"}
                      </button>
                    ) : undefined
                  }
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,text/plain,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleUploadWithAutoSave(file)
                      e.target.value = ""
                    }
                  }}
                />
              </>
            )}

            {badge ? (
              <div
                className={`
                  absolute top-4 right-4 z-20 flex items-center gap-2 border
                  px-3 py-1.5 font-mono text-xs shadow-sm backdrop-blur-sm
                  ${
                    badge.type === "error"
                      ? "border-red-400 bg-red-900 text-red-200"
                      : `
                        border-tech-accent bg-tech-main text-tech-accent
                        shadow-tech-accent/20
                      `
                  }
                `}
                role="status"
                aria-live="polite">
                {badge.type === "progress" ? (
                  <span className="inline-block size-2 animate-pulse bg-tech-accent" />
                ) : null}
                {badge.type === "error" ? (
                  <span className="inline-block size-2 bg-red-400" />
                ) : null}
                {badge.message}
                {badge.type !== "progress" ? (
                  <button
                    type="button"
                    onClick={clearBadge}
                    className="
                      ml-2 text-current/80
                      hover:text-current
                    "
                    aria-label="Dismiss">
                    X
                  </button>
                ) : null}
              </div>
            ) : null}

            <section
              id="draft-editor-write-panel"
              role="tabpanel"
              className="editor-grow"
              hidden={activeTab !== "write"}>
              <div className="editor-surface">
                <textarea
                  ref={textareaRef}
                  className={`
                    w-full grow resize-none border-none p-6 font-mono
                    text-sm/relaxed text-black placeholder-zinc-500 outline-none
                    ${
                      isReadOnly
                        ? `cursor-not-allowed bg-gray-50`
                        : `bg-transparent`
                    }
                  `}
                  placeholder="ENTER CONTENT... (Use Markdown)"
                  value={activeFileContent}
                  onChange={(e) =>
                    updateActiveFile({ content: e.target.value })
                  }
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    if (!isReadOnly) e.preventDefault()
                  }}
                  onDragEnter={(e) => {
                    if (!isReadOnly) e.preventDefault()
                  }}
                  readOnly={isReadOnly}
                  aria-busy={isSaving}
                />

                {badge && (
                  <div
                    className={`
                      absolute top-4 right-4 z-20 flex items-center gap-2 border
                      px-3 py-1.5 font-mono text-xs shadow-sm backdrop-blur-sm
                      ${
                        badge.type === "error"
                          ? "border-red-400 bg-red-900 text-red-200"
                          : `
                            border-tech-accent bg-tech-main text-tech-accent
                            shadow-tech-accent/20
                          `
                      }
                    `}
                    role="status"
                    aria-live="polite">
                    {badge.type === "progress" && (
                      <span
                        className="
                          inline-block size-2 animate-pulse bg-tech-accent
                        "
                      />
                    )}
                    {badge.type === "error" && (
                      <span className="inline-block size-2 bg-red-400" />
                    )}
                    {badge.message}
                    {badge.type === "error" && (
                      <button
                        type="button"
                        onClick={clearBadge}
                        className="
                          ml-2 text-red-300
                          hover:text-red-100
                        ">
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section
              id="draft-editor-preview-panel"
              role="tabpanel"
              hidden={activeTab !== "preview"}
              className="editor-grow">
              {activeFileContent.trim() ? (
                <div
                  className="
                    w-full max-w-none overflow-hidden p-6 wrap-break-word
                    selection:bg-tech-main/20 selection:text-slate-900
                    sm:p-8
                  ">
                  <MarkdownPreview content={activeFileContent} />
                </div>
              ) : (
                <p className="editor-panel">NOTHING_TO_PREVIEW_</p>
              )}
            </section>
          </div>
        </div>
      </div>

      {!isReadOnly && (
        <div
          className="
            relative mt-6 flex justify-end gap-4 border-t border-tech-main/10
            pt-4
          ">
          <div className="corner-tick" />

          <BrutalButton
            type="submit"
            variant="primary"
            disabled={saveDisabled}
            aria-busy={isSaving}>
            {isSaving ? (
              <LoadingIndicator label={PENDING_LABELS.SAVING_DRAFT} />
            ) : (
              "SAVE DRAFT"
            )}
          </BrutalButton>

          <BrutalButton
            type="button"
            variant="ghost"
            onClick={handleSubmitReview}
            disabled={submitDisabled}
            aria-busy={isSubmittingReview}>
            {isSubmittingReview ? (
              <LoadingIndicator label={PENDING_LABELS.SUBMITTING_REVIEW} />
            ) : (
              "OPEN PR & SYNC MAIN"
            )}
          </BrutalButton>
        </div>
      )}

      <DraftFileSourceDialog
        isOpen={isAddFileDialogOpen}
        initialFolderPath={getParentFolderPath(activeFile.filePath)}
        onClose={() => setIsAddFileDialogOpen(false)}
        onCreate={handleCreateDraftFile}
      />
    </form>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface UploadResponse {
  error?: string
  fileSize?: number
  filename?: string
  mimeType?: string
  url?: string
}

function getParentFolderPath(filePath: string) {
  const normalized = normalizeDraftFilePath(filePath)
  const lastSlashIndex = normalized.lastIndexOf("/")
  return lastSlashIndex >= 0 ? normalized.slice(0, lastSlashIndex) : ""
}
