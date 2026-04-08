"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"

import { saveDraftAction, submitForReviewAction } from "@/actions/article"
import { DraftFileSourceDialog } from "@/components/editor/draft-file-source-dialog"
import { DraftFileList } from "@/components/editor/draft-file-list"
import { EditorBadge } from "@/components/editor/editor-badge"
import { EditorFileUploadInput } from "@/components/editor/editor-file-upload-input"
import { LazyMarkdownPreview } from "@/components/editor/lazy-markdown-preview"
import {
  EditorTabStrip,
  type TabType,
} from "@/components/editor/editor-tab-strip"
import { EditorTextarea } from "@/components/editor/editor-textarea"
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
  OperationProgress,
  type OperationProgressStage,
  type OperationProgressState,
} from "@/components/ui/operation-progress"
import { TechButton } from "../ui/tech-button"
import { InputBox } from "../ui/input-box"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { useBadge } from "@/hooks/use-badge"
import { useEditorUpload } from "@/hooks/use-editor-upload"

interface DraftEditorProps {
  initialData?: {
    activeFileId?: string
    id?: string
    githubPrUrl?: string
    files: DraftFileCollection["files"]
    title: string
    status?: string
  }
}

export function DraftEditor({ initialData }: DraftEditorProps) {
  const router = useRouter()
  const t = useTranslations("Editor")
  const progressT = useTranslations("OperationProgress")
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
  const [saveProgressState, setSaveProgressState] =
    React.useState<OperationProgressState>("idle")
  const [submitProgressState, setSubmitProgressState] =
    React.useState<OperationProgressState>("idle")
  const [activeTab, setActiveTab] = React.useState<TabType>("write")
  const [lineWrap, setLineWrap] = React.useState(false)

  const textareaRef = React.useRef<any>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const saveProgressResetRef = React.useRef<number | null>(null)
  const submitProgressResetRef = React.useRef<number | null>(null)
  const { badge, showBadge, clearBadge } = useBadge()

  const saveProgressStages = React.useMemo<OperationProgressStage[]>(
    () => [
      {
        id: "normalize",
        label: progressT("saveDraftStageNormalize"),
        durationMs: 260,
      },
      {
        id: "serialize",
        label: progressT("saveDraftStageSerialize"),
        durationMs: 300,
      },
      {
        id: "persist",
        label: progressT("saveDraftStagePersist"),
        durationMs: 940,
      },
      {
        id: "assets",
        label: progressT("saveDraftStageAssets"),
        durationMs: 540,
      },
      {
        id: "refresh",
        label: progressT("saveDraftStageRefresh"),
        durationMs: 280,
      },
    ],
    [progressT]
  )

  const submitProgressStages = React.useMemo<OperationProgressStage[]>(
    () => [
      {
        id: "preflight",
        label: progressT("submitStagePreflight"),
        durationMs: 260,
      },
      {
        id: "assets",
        label: progressT("submitStageAssets"),
        durationMs: 580,
      },
      {
        id: "migrate",
        label: progressT("submitStageMigrate"),
        durationMs: 760,
      },
      {
        id: "open-pr",
        label: progressT("submitStagePr"),
        durationMs: 920,
      },
      {
        id: "refresh",
        label: progressT("submitStageRefresh"),
        durationMs: 300,
      },
    ],
    [progressT]
  )

  React.useEffect(() => {
    return () => {
      if (saveProgressResetRef.current !== null) {
        window.clearTimeout(saveProgressResetRef.current)
      }

      if (submitProgressResetRef.current !== null) {
        window.clearTimeout(submitProgressResetRef.current)
      }
    }
  }, [])

  const updateSaveProgressState = (
    nextState: Exclude<OperationProgressState, "idle">
  ) => {
    if (saveProgressResetRef.current !== null) {
      window.clearTimeout(saveProgressResetRef.current)
      saveProgressResetRef.current = null
    }

    setSaveProgressState(nextState)

    if (nextState === "running") {
      return
    }

    saveProgressResetRef.current = window.setTimeout(
      () => {
        setSaveProgressState("idle")
      },
      nextState === "success" ? 1400 : 3200
    )
  }

  const updateSubmitProgressState = (
    nextState: Exclude<OperationProgressState, "idle">
  ) => {
    if (submitProgressResetRef.current !== null) {
      window.clearTimeout(submitProgressResetRef.current)
      submitProgressResetRef.current = null
    }

    setSubmitProgressState(nextState)

    if (nextState === "running") {
      return
    }

    submitProgressResetRef.current = window.setTimeout(
      () => {
        setSubmitProgressState("idle")
      },
      nextState === "success" ? 1400 : 3200
    )
  }

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
    if (!textareaRef.current) return
    const view = textareaRef.current.view
    if (!view) return

    const selection = view.state.selection.main

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: text,
      },
      selection: {
        anchor: selection.from + text.length,
        head: selection.from + text.length,
      },
    })

    view.focus()
  }

  const insertSyntax = (prefix: string, suffix: string = "") => {
    if (isReadOnly || !textareaRef.current) return
    const view = textareaRef.current.view
    if (!view) return

    const selection = view.state.selection.main
    const selectedText = view.state.sliceDoc(selection.from, selection.to)
    const newText = prefix + selectedText + suffix

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: newText,
      },
      selection: {
        anchor: selection.from + prefix.length,
        head: selection.from + prefix.length + selectedText.length,
      },
    })

    view.focus()
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
      updateSaveProgressState("running")
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

        const result = await saveDraftAction(formData)
        if (result.success && result.revisionId) {
          setDraftCollection(normalizedDraftCollection)
          setRevisionId(result.revisionId)
          updateSaveProgressState("success")
          clearBadge()
        } else {
          updateSaveProgressState("error")
          showBadge("SAVE_FAILED_ Cannot upload without saved draft.", "error")
          return
        }
      } catch {
        updateSaveProgressState("error")
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
    updateSaveProgressState("running")

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

      const result = await saveDraftAction(formData)
      if (result.success && result.revisionId) {
        setDraftCollection(normalizedDraftCollection)
        setRevisionId(result.revisionId)
        updateSaveProgressState("success")
        showBadge("DRAFT_SAVED_", "info", 3000)
      }
    } catch (error) {
      console.error(error)
      updateSaveProgressState("error")
      showBadge("SAVE_FAILED_", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!revisionId) {
      showBadge("SAVE_DRAFT_FIRST_", "error", 3000)
      return
    }

    if (hasMissingFilePath) {
      showBadge("ALL_FILES_NEED_PATH_", "error", 4000)
      return
    }

    if (duplicateFilePaths.length > 0) {
      showBadge(
        `DUPLICATE_PATHS_: ${duplicateFilePaths.join(", ")}`,
        "error",
        4000
      )
      return
    }

    setIsSubmittingReview(true)
    updateSubmitProgressState("running")
    try {
      const result = await submitForReviewAction(revisionId)
      setDraftStatus(result.status)
      updateSubmitProgressState("success")
      showBadge(
        result.status === "SYNC_CONFLICT"
          ? "SYNC_CONFLICT_DETECTED_"
          : "PR_OPENED_",
        "info",
        4000
      )
      router.push(`/draft/${revisionId}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      updateSubmitProgressState("error")
      showBadge("SUBMIT_FAILED_", "error")
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
      showBadge("FILE_ALREADY_EXISTS_", "error", 3000)
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
            {t("titleLabel")}
          </label>
          <InputBox
            id="draft-title"
            required
            placeholder={t("titlePlaceholder")}
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
            {t("conflictTitle")}
          </p>
          <p className="text-sm">{t("conflictMessage")}</p>
        </div>
      ) : null}

      <div
        className="
          grid gap-4
          lg:grid-cols-[18rem_minmax(0,1fr)]
        ">
        <DraftFileList
          files={draftCollection.files}
          activeFileId={draftCollection.activeFileId}
          onSelectFile={(fileId) =>
            setDraftCollection((current) => ({
              ...current,
              activeFileId: fileId,
            }))
          }
          onAddFile={handleAddFile}
          onRemoveFile={handleRemoveFile}
          isReadOnly={isReadOnly}
        />

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
              <p className="font-mono text-[0.6875rem] text-tech-main/60 uppercase">
                DIRECT_REPO_EDIT
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="draft-file-path" className="section-label">
                FILE_PATH_
              </label>
              <InputBox
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
                {t("duplicatePathError")}
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
            <EditorTabStrip
              activeTab={activeTab}
              onTabChange={setActiveTab}
              writeId="draft-editor-write-panel"
              previewId="draft-editor-preview-panel"
              rightSlot={
                activeFile.filePath || `UNTITLED_FILE_${activeFileIndex}`
              }
            />

            {activeTab === "write" && (
              <>
                <EditorToolbar
                  onInsert={insertSyntax}
                  disabled={isReadOnly || isUploading}
                  lineWrap={lineWrap}
                  onWrapToggle={() => setLineWrap((v) => !v)}
                  fileUploadSlot={
                    !isReadOnly ? (
                      <EditorFileUploadInput
                        fileInputRef={fileInputRef}
                        onFileSelect={handleUploadWithAutoSave}
                        isUploading={isUploading}
                        isCompressing={isCompressing}
                      />
                    ) : undefined
                  }
                />
              </>
            )}

            <EditorBadge badge={badge} onDismiss={clearBadge} />

            <section
              id="draft-editor-write-panel"
              role="tabpanel"
              className="editor-grow"
              hidden={activeTab !== "write"}>
              <div className="editor-surface">
                <EditorTextarea
                  ref={textareaRef}
                  value={activeFileContent}
                  onChange={(value) => updateActiveFile({ content: value })}
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    if (!isReadOnly) e.preventDefault()
                  }}
                  onDragEnter={(e) => {
                    if (!isReadOnly) e.preventDefault()
                  }}
                  isReadOnly={isReadOnly}
                  isSaving={isSaving}
                  placeholder={t("bodyPlaceholder")}
                  lineWrap={lineWrap}
                />
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
                  <LazyMarkdownPreview
                    content={activeFileContent}
                    rawPath={activeFile.filePath || ""}
                  />
                </div>
              ) : (
                <p className="editor-panel">NOTHING_TO_PREVIEW_</p>
              )}
            </section>
          </div>
        </div>
      </div>

      {!isReadOnly && (
        <>
          <OperationProgress
            state={saveProgressState}
            title={progressT("saveDraftTitle")}
            stages={saveProgressStages}
            successLabel={progressT("saveDraftSuccess")}
            errorLabel={progressT("saveDraftError")}
          />

          <OperationProgress
            state={submitProgressState}
            title={progressT("submitTitle")}
            stages={submitProgressStages}
            successLabel={progressT("submitSuccess")}
            errorLabel={progressT("submitError")}
          />

          <div
            className="
              relative mt-6 flex justify-end gap-4 border-t border-tech-main/10
              pt-4
            ">
            <div className="corner-tick" />

            <TechButton
              type="submit"
              variant="primary"
              disabled={saveDisabled}
              aria-busy={isSaving}>
              {isSaving ? t("savingLabel") : t("saveButton")}
            </TechButton>

            <TechButton
              type="button"
              variant="ghost"
              onClick={handleSubmitReview}
              disabled={submitDisabled}
              aria-busy={isSubmittingReview}>
              {isSubmittingReview ? progressT("submitBusy") : t("submitButton")}
            </TechButton>
          </div>

          <section
            aria-label={t("submissionLicenseAria")}
            className="mt-4 border guide-line bg-tech-main/5 p-4 font-mono text-[0.6875rem] leading-relaxed text-tech-main/80">
            <p className="section-label">{t("submissionLicenseTitle")}</p>
            <div className="mt-2 space-y-2">
              <p>{t("submissionLicenseIntro")}</p>
              <p>
                {t("submissionLicenseReusePrefix")}{" "}
                <a
                  href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-tech-main/30 underline-offset-4 transition-colors hover:text-tech-main-dark hover:decoration-tech-main-dark">
                  CC BY-NC-SA 4.0
                </a>
                {t("submissionLicenseReuseSuffix")}
              </p>
              <p>{t("submissionLicenseAttribution")}</p>
            </div>
          </section>
        </>
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
