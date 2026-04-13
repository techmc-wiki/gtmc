"use client"

import * as React from "react"
import { diffLines } from "diff"
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror"
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
  normalizeDraftFolderPath,
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
import { useBadge } from "@/hooks/use-badge"
import { useEditorUpload } from "@/hooks/use-editor-upload"
import type { SourceMode } from "@/components/editor/draft-file-source-dialog"

interface DraftEditorProps {
  initialData?: {
    activeFileId?: string
    contributingGuides?: Array<{
      id: string
      title: string
      content: string
    }>
    folders?: string[]
    id?: string
    githubPrUrl?: string
    files: DraftFileCollection["files"]
    title: string
    status?: string
  }
}

const MAX_DRAFT_HISTORY_ENTRIES = 100

interface DraftContentHistory {
  undoStack: string[]
  redoStack: string[]
}

interface DraftFileDialogIntent {
  kind: "add" | "replace"
  initialMode: SourceMode
}

interface RepoFileSnapshot {
  content: string | null
  filePath: string
  status: "error" | "loaded" | "loading" | "missing"
}

interface DraftDiffRow {
  newLine: number | null
  oldLine: number | null
  type: "add" | "context" | "remove" | "skipped"
  value: string
}

export function DraftEditor({ initialData }: DraftEditorProps) {
  const router = useRouter()
  const t = useTranslations("Editor")
  const progressT = useTranslations("OperationProgress")
  const initialStatus = initialData?.status || "DRAFT"
  const initialDraftCollection = React.useMemo(
    () =>
      normalizeDraftFileCollection({
        activeFileId: initialData?.activeFileId,
        folders: initialData?.folders,
        files:
          initialData?.files && initialData.files.length > 0
            ? initialData.files
            : [createDraftFile()],
      }),
    [initialData?.activeFileId, initialData?.files, initialData?.folders]
  )

  const [draftStatus, setDraftStatus] = React.useState(initialStatus)
  const [title, setTitle] = React.useState(initialData?.title || "")
  const [draftCollection, setDraftCollection] = React.useState(
    initialDraftCollection
  )
  const [lastSavedDraftCollection, setLastSavedDraftCollection] =
    React.useState(initialDraftCollection)
  const [lastSavedTitle, setLastSavedTitle] = React.useState(
    initialData?.title || ""
  )
  const [revisionId, setRevisionId] = React.useState<string | undefined>(
    initialData?.id
  )
  const [fileDialogIntent, setFileDialogIntent] =
    React.useState<DraftFileDialogIntent | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false)
  const [saveProgressState, setSaveProgressState] =
    React.useState<OperationProgressState>("idle")
  const [submitProgressState, setSubmitProgressState] =
    React.useState<OperationProgressState>("idle")
  const [activeTab, setActiveTab] = React.useState<TabType>("write")
  const [lineWrap, setLineWrap] = React.useState(false)
  const [activeInfoTab, setActiveInfoTab] = React.useState<"changes" | "guide">(
    "changes"
  )
  const [activeGuideId, setActiveGuideId] = React.useState(
    initialData?.contributingGuides?.[0]?.id || ""
  )
  const [repoSnapshots, setRepoSnapshots] = React.useState<
    Record<string, RepoFileSnapshot>
  >({})
  const [insertDialogIntent, setInsertDialogIntent] = React.useState(false)

  const textareaRef = React.useRef<ReactCodeMirrorRef | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const autoSaveTimeoutRef = React.useRef<number | null>(null)
  const saveProgressResetRef = React.useRef<number | null>(null)
  const submitProgressResetRef = React.useRef<number | null>(null)
  const contentHistoryRef = React.useRef<Record<string, DraftContentHistory>>(
    {}
  )
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
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
      }

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
  const contributingGuides = initialData?.contributingGuides || []
  const unsavedFileIds = React.useMemo(() => {
    const savedFilesById = new Map(
      lastSavedDraftCollection.files.map((file) => [file.id, file])
    )
    const nextUnsavedFileIds = new Set<string>()

    for (const file of draftCollection.files) {
      const savedFile = savedFilesById.get(file.id)

      if (
        !savedFile ||
        savedFile.content !== file.content ||
        normalizeDraftFilePath(savedFile.filePath) !==
          normalizeDraftFilePath(file.filePath)
      ) {
        nextUnsavedFileIds.add(file.id)
      }
    }

    return nextUnsavedFileIds
  }, [draftCollection.files, lastSavedDraftCollection.files])
  const hasUnsavedChanges =
    title !== lastSavedTitle ||
    draftCollection.files.length !== lastSavedDraftCollection.files.length ||
    (draftCollection.folders || []).join("|") !==
      (lastSavedDraftCollection.folders || []).join("|") ||
    unsavedFileIds.size > 0

  const updateDraftCollection = (
    updater: (current: DraftFileCollection) => DraftFileCollection
  ) => {
    setDraftCollection((current) =>
      normalizeDraftFileCollection(updater(current))
    )
  }

  const getDraftContentHistory = React.useCallback((fileId: string) => {
    const existingHistory = contentHistoryRef.current[fileId]

    if (existingHistory) {
      return existingHistory
    }

    const nextHistory: DraftContentHistory = {
      undoStack: [],
      redoStack: [],
    }
    contentHistoryRef.current[fileId] = nextHistory
    return nextHistory
  }, [])

  const pushHistoryEntry = React.useCallback(
    (stack: string[], value: string) => {
      if (stack[stack.length - 1] === value) {
        return
      }

      stack.push(value)

      if (stack.length > MAX_DRAFT_HISTORY_ENTRIES) {
        stack.splice(0, stack.length - MAX_DRAFT_HISTORY_ENTRIES)
      }
    },
    []
  )

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

  const updateFileContent = React.useCallback(
    (
      fileId: string,
      nextContent: string,
      mode: "record" | "undo" | "redo" = "record"
    ) => {
      updateDraftCollection((current) => {
        const targetFile = current.files.find((file) => file.id === fileId)

        if (!targetFile || targetFile.content === nextContent) {
          return current
        }

        const history = getDraftContentHistory(fileId)

        if (mode === "record") {
          pushHistoryEntry(history.undoStack, targetFile.content)
          history.redoStack = []
        } else if (mode === "undo") {
          pushHistoryEntry(history.redoStack, targetFile.content)
        } else {
          pushHistoryEntry(history.undoStack, targetFile.content)
        }

        return {
          ...current,
          files: current.files.map((file) =>
            file.id === fileId ? { ...file, content: nextContent } : file
          ),
        }
      })
    },
    [getDraftContentHistory, pushHistoryEntry]
  )

  const updateActiveFile = (updates: {
    content?: string
    filePath?: string
  }) => {
    if (updates.content !== undefined) {
      updateFileContent(draftCollection.activeFileId, updates.content)
    }

    if (updates.filePath !== undefined) {
      updateFileById(draftCollection.activeFileId, {
        filePath: updates.filePath,
      })
    }
  }

  const persistDraft = React.useCallback(async () => {
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
    if (revisionId) {
      formData.append("revisionId", revisionId)
    }

    const result = await saveDraftAction(formData)

    if (!result.success || !result.revisionId) {
      throw new Error("Failed to save draft")
    }

    setDraftCollection(normalizedDraftCollection)
    setLastSavedDraftCollection(normalizedDraftCollection)
    setLastSavedTitle(title)
    setRevisionId(result.revisionId)

    return {
      normalizedDraftCollection,
      revisionId: result.revisionId,
    }
  }, [draftCollection, revisionId, title])

  const saveDraftWithFeedback = React.useCallback(
    async (mode: "manual" | "auto" = "manual") => {
      if (isSaving || !title.trim()) {
        return
      }

      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }

      setIsSaving(true)

      if (mode === "manual") {
        updateSaveProgressState("running")
      }

      try {
        await persistDraft()

        if (mode === "manual") {
          updateSaveProgressState("success")
          showBadge("DRAFT_SAVED_", "info", 3000)
        } else {
          showBadge("AUTOSAVED_", "info", 1800)
        }
      } catch (error) {
        console.error(error)

        if (mode === "manual") {
          updateSaveProgressState("error")
          showBadge("SAVE_FAILED_", "error")
        } else {
          showBadge("AUTOSAVE_FAILED_", "error")
        }
      } finally {
        setIsSaving(false)
      }
    },
    [isSaving, persistDraft, showBadge, title]
  )

  const handleUndoDraftEdit = React.useCallback(() => {
    if (isReadOnly) {
      return
    }

    const history = contentHistoryRef.current[draftCollection.activeFileId]
    const previousContent = history?.undoStack.pop()

    if (previousContent === undefined) {
      return
    }

    updateFileContent(draftCollection.activeFileId, previousContent, "undo")
  }, [draftCollection.activeFileId, isReadOnly, updateFileContent])

  const handleRedoDraftEdit = React.useCallback(() => {
    if (isReadOnly) {
      return
    }

    const history = contentHistoryRef.current[draftCollection.activeFileId]
    const nextContent = history?.redoStack.pop()

    if (nextContent === undefined) {
      return
    }

    updateFileContent(draftCollection.activeFileId, nextContent, "redo")
  }, [draftCollection.activeFileId, isReadOnly, updateFileContent])

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
        throw new Error(t("errorFileTooLarge"))
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("errorUploadFailed"))

      return {
        url: data.url,
        filename: data.filename,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
      }
    },
    [revisionId, t]
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

  React.useEffect(() => {
    if (isReadOnly || !title.trim() || !hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
      return
    }

    if (isSaving || isSubmittingReview || isUploading) {
      return
    }

    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = window.setTimeout(() => {
      autoSaveTimeoutRef.current = null
      void saveDraftWithFeedback("auto")
    }, 1500)

    return () => {
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
    }
  }, [
    draftCollection,
    hasUnsavedChanges,
    isReadOnly,
    isSaving,
    isSubmittingReview,
    isUploading,
    saveDraftWithFeedback,
    title,
  ])

  React.useEffect(() => {
    if (isReadOnly) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "s"
      ) {
        return
      }

      event.preventDefault()

      if (isSubmittingReview || isUploading || !title.trim()) {
        return
      }

      void saveDraftWithFeedback("manual")
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    isReadOnly,
    isSubmittingReview,
    isUploading,
    saveDraftWithFeedback,
    title,
  ])

  const handleUploadWithAutoSave = async (file: File) => {
    if (!revisionId) {
      showBadge(t("badgeSavingBeforeUpload"), "progress")
      setIsSaving(true)
      updateSaveProgressState("running")
      try {
        const result = await persistDraft()
        if (result.revisionId) {
          updateSaveProgressState("success")
          clearBadge()
        } else {
          updateSaveProgressState("error")
          showBadge(t("badgeSaveFailedUpload"), "error")
          return
        }
      } catch {
        updateSaveProgressState("error")
        showBadge(t("badgeSaveFailedUpload"), "error")
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
    await saveDraftWithFeedback("manual")
  }

  const handleSubmitReview = async () => {
    if (hasMissingFilePath) {
      showBadge(t("badgeAllFilesNeedPath"), "error", 4000)
      return
    }

    if (duplicateFilePaths.length > 0) {
      showBadge(
        t("duplicatePathsError", { paths: duplicateFilePaths.join(", ") }),
        "error",
        4000
      )
      return
    }

    setIsSubmittingReview(true)
    updateSubmitProgressState("running")
    try {
      const persistedDraft = await persistDraft()
      const result = await submitForReviewAction(persistedDraft.revisionId)
      setDraftStatus(result.status)
      updateSubmitProgressState("success")
      showBadge(
        result.status === "SYNC_CONFLICT"
          ? t("badgeSyncConflict")
          : t("badgePrOpened"),
        "info",
        4000
      )
      router.push(`/draft/${persistedDraft.revisionId}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      updateSubmitProgressState("error")
      showBadge(t("badgeSubmitFailed"), "error")
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const openFileDialog = React.useCallback(
    (kind: DraftFileDialogIntent["kind"], initialMode: SourceMode) => {
      if (isReadOnly) {
        return
      }

      setFileDialogIntent({ kind, initialMode })
    },
    [isReadOnly]
  )

  const handleAddFile = () => {
    openFileDialog("add", "repo")
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
        folders: current.folders || [],
        files: remainingFiles,
      }
    })
  }

  const handleApplyDraftFileSource = ({
    content,
    filePath,
  }: {
    content: string
    filePath: string
  }) => {
    const normalizedPath = normalizeDraftFilePath(filePath)
    const hasDuplicate = draftCollection.files.some(
      (file) =>
        normalizeDraftFilePath(file.filePath) === normalizedPath &&
        (fileDialogIntent?.kind !== "replace" || file.id !== activeFile.id)
    )

    if (hasDuplicate) {
      showBadge(t("badgeFileAlreadyExists"), "error", 3000)
      return false
    }

    if (fileDialogIntent?.kind === "replace") {
      updateDraftCollection((current) => ({
        ...current,
        files: current.files.map((file) =>
          file.id === current.activeFileId
            ? {
                ...file,
                content,
                filePath: normalizedPath,
              }
            : file
        ),
      }))
      setActiveTab("write")
      setFileDialogIntent(null)
      return true
    }

    const nextFile = createDraftFile({
      content,
      filePath: normalizedPath,
    })

    updateDraftCollection((current) => ({
      activeFileId: nextFile.id,
      folders: current.folders || [],
      files: [...current.files, nextFile],
    }))
    setActiveTab("write")
    setFileDialogIntent(null)
    return true
  }

  React.useEffect(() => {
    const pendingFiles = draftCollection.files.filter((file) => {
      const normalizedPath = normalizeDraftFilePath(file.filePath)
      if (!normalizedPath) {
        return false
      }

      const snapshot = repoSnapshots[file.id]
      return !snapshot || snapshot.filePath !== normalizedPath
    })

    for (const file of pendingFiles) {
      const normalizedPath = normalizeDraftFilePath(file.filePath)
      if (!normalizedPath) {
        continue
      }

      setRepoSnapshots((current) => ({
        ...current,
        [file.id]: {
          content: null,
          filePath: normalizedPath,
          status: "loading",
        },
      }))

      void fetch(
        `/api/draft/repo-file?path=${encodeURIComponent(normalizedPath)}`,
        {
          cache: "no-store",
        }
      )
        .then(async (response) => {
          if (response.status === 404) {
            setRepoSnapshots((current) => ({
              ...current,
              [file.id]: {
                content: null,
                filePath: normalizedPath,
                status: "missing",
              },
            }))
            return
          }

          const data = (await response.json()) as {
            content?: string
            error?: string
          }

          if (!response.ok || typeof data.content !== "string") {
            throw new Error(data.error || "Failed to load repository file")
          }

          setRepoSnapshots((current) => ({
            ...current,
            [file.id]: {
              content: data.content ?? "",
              filePath: normalizedPath,
              status: "loaded",
            },
          }))
        })
        .catch(() => {
          setRepoSnapshots((current) => ({
            ...current,
            [file.id]: {
              content: null,
              filePath: normalizedPath,
              status: "error",
            },
          }))
        })
    }
  }, [draftCollection.files, repoSnapshots])

  const changeEntries = React.useMemo(
    () =>
      draftCollection.files
        .map((file) => {
          const normalizedPath = normalizeDraftFilePath(file.filePath)
          const snapshot = repoSnapshots[file.id]

          if (!normalizedPath) {
            return {
              changeType: "pending" as const,
              file,
              rows: buildDiffRows("", file.content),
            }
          }

          if (!snapshot || snapshot.status === "loading") {
            return {
              changeType: "pending" as const,
              file,
              rows: buildDiffRows("", file.content),
            }
          }

          if (snapshot.status === "missing") {
            return {
              changeType: "new" as const,
              file,
              rows: buildDiffRows("", file.content),
            }
          }

          if (snapshot.status === "error" || snapshot.content === null) {
            return null
          }

          if (snapshot.content === file.content) {
            return null
          }

          return {
            changeType: "modified" as const,
            file,
            rows: buildDiffRows(snapshot.content, file.content),
          }
        })
        .filter(Boolean),
    [draftCollection.files, repoSnapshots]
  )

  const newFolderPaths = React.useMemo(
    () => draftCollection.folders || [],
    [draftCollection.folders]
  )

  const handleInsertSelectedFile = ({
    filePath,
  }: {
    content: string
    filePath: string
  }) => {
    const normalizedTargetPath = normalizeDraftFilePath(filePath)

    if (!normalizedTargetPath) {
      return false
    }

    const linkLabel = normalizedTargetPath
      .split("/")
      .filter(Boolean)
      .slice(-1)[0]
      ?.replace(/\.md$/i, "")

    insertTextAtCursor(
      `[${linkLabel || "linked-file"}](${normalizedTargetPath})`
    )
    setInsertDialogIntent(false)
    return true
  }

  const handleCreateFolder = (folderPath: string) => {
    const normalizedFolderPath = normalizeDraftFolderPath(folderPath)

    if (!normalizedFolderPath) {
      showBadge("INVALID_FOLDER_NAME_", "error", 2800)
      return false
    }

    updateDraftCollection((current) => ({
      ...current,
      folders: [...(current.folders || []), normalizedFolderPath],
    }))
    showBadge("FOLDER_READY_", "info", 2000)
    setFileDialogIntent(null)
    return true
  }

  const saveDisabled = isSaving || !title.trim()
  const activeFileHistory =
    contentHistoryRef.current[draftCollection.activeFileId]
  const submitDisabled =
    isSubmittingReview ||
    isSaving ||
    isUploading ||
    !title.trim() ||
    hasMissingFilePath ||
    duplicateFilePaths.length > 0

  return (
    <form
      onSubmit={handleSaveDraft}
      className="
        group relative flex w-full flex-col space-y-6 border border-tech-main/60
        bg-[#fbfbfd] p-4 shadow-[inset_0_0_100px_rgba(96,112,143,0.03)]
        before:absolute
        before:inset-0 before:z-[-1] before:bg-[url('/bg-grid.svg')] before:bg-size-[24px_24px]
        before:opacity-[0.04] sm:p-6
      ">
      <div className="absolute -top-px -left-px size-3 border-t-2 border-l-2 border-tech-main" />
      <div className="absolute -top-px -right-px size-3 border-t-2 border-r-2 border-tech-main" />
      <div className="absolute -bottom-px -left-px size-3 border-b-2 border-l-2 border-tech-main" />
      <div className="absolute -right-px -bottom-px size-3 border-r-2 border-b-2 border-tech-main" />

      <div className="relative z-10 flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="draft-title"
              className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-tech-main uppercase">
              <span className="inline-block size-2 bg-tech-main/40" />
              {t("titleLabel")}
            </label>
          </div>
          <InputBox
            id="draft-title"
            required
            placeholder={t("titlePlaceholder")}
            className={`
              border-tech-main/40 bg-white/50 py-3 font-mono text-lg backdrop-blur-sm
              transition-all duration-300 focus:border-tech-main focus:bg-white
              focus:ring-1 focus:ring-tech-main/20
              ${
                isReadOnly
                  ? `cursor-not-allowed bg-tech-main/5 opacity-70`
                  : `hover:bg-white/80`
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
          <span>{t("prStreamActive")}</span>
          <a
            href={githubPrUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4">
            {t("openGithubPr")}
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
          unsavedFileIds={unsavedFileIds}
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
                <p className="section-label">{t("activeFileLabel")}</p>
                <p
                  className="
                    font-mono text-xs tracking-widest text-tech-main/70
                    uppercase
                  ">
                  {`${t("slotLabel")}_${activeFileIndex}/${draftCollection.files.length}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <TechButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isReadOnly}
                  onClick={() => openFileDialog("replace", "repo")}>
                  {t("chooseExistingFile")}
                </TechButton>
                <TechButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isReadOnly}
                  onClick={() => openFileDialog("replace", "new")}>
                  {t("createTargetFile")}
                </TechButton>
                <TechButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isReadOnly}
                  onClick={() => openFileDialog("replace", "upload")}>
                  {t("importTargetFile")}
                </TechButton>
                <TechButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isReadOnly}
                  onClick={() => openFileDialog("add", "folder")}>
                  NEW FOLDER
                </TechButton>
                <TechButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isReadOnly}
                  onClick={() => setInsertDialogIntent(true)}>
                  INSERT FILE LINK
                </TechButton>
              </div>
            </div>

            <div className="space-y-3 border guide-line bg-tech-main/5 p-4">
              <div>
                <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/45 uppercase">
                  {t("targetFileLabel")}
                </p>
                <p className="mt-1 font-mono text-sm tracking-widest break-all text-tech-main uppercase">
                  {activeFile.filePath || t("targetFileUnset")}
                </p>
              </div>
              <p className="font-mono text-xs/relaxed text-tech-main/65">
                {t("targetFileDescription")}
              </p>
            </div>

            {activeFileHasDuplicatePath ? (
              <p className="mt-3 font-mono text-xs text-red-500">
                {t("duplicatePathError")}
              </p>
            ) : null}

            {!activeFile.filePath && !isReadOnly ? (
              <p className="mt-3 font-mono text-xs text-amber-700">
                {t("filePathBlankHint")}
              </p>
            ) : null}

            {duplicateFilePaths.length > 0 ? (
              <p className="mt-2 font-mono text-xs text-red-500">
                {t("duplicatePathsError", {
                  paths: duplicateFilePaths.join(", "),
                })}
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
                <div
                  className="
                    relative flex h-12 items-center
                    gap-2 overflow-x-auto scroll-smooth border-b
                    guide-line bg-tech-main/4 px-4 shadow-[inset_0_1px_4px_rgba(96,112,143,0.05)]
                  ">
                  <div className="absolute inset-y-0 left-0 w-1 bg-tech-main/30" />
                  <span className="mr-2 font-mono text-[9px] tracking-widest text-tech-main/50 uppercase opacity-70">
                    MACROS
                  </span>

                  <TechButton
                    type="button"
                    variant="ghost"
                    className="h-7 border border-transparent px-3 text-[10px] tracking-widest text-tech-main transition-all hover:guide-line hover:bg-white hover:text-tech-main hover:shadow-sm"
                    disabled={isReadOnly}
                    onClick={() =>
                      insertTextAtCursor("\n## Section Title\n\n")
                    }>
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-tech-main/40">#</span>{" "}
                      SECTION
                    </span>
                  </TechButton>
                  <TechButton
                    type="button"
                    variant="ghost"
                    className="h-7 border border-transparent px-3 text-[10px] tracking-widest text-tech-main transition-all hover:guide-line hover:bg-white hover:text-tech-main hover:shadow-sm"
                    disabled={isReadOnly}
                    onClick={() =>
                      insertTextAtCursor(
                        "\n> [!TIP]\n> Add contributor guidance here.\n\n"
                      )
                    }>
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-tech-main/40">{">"}</span>{" "}
                      CALLOUT
                    </span>
                  </TechButton>
                  <TechButton
                    type="button"
                    variant="ghost"
                    className="h-7 border border-transparent px-3 text-[10px] tracking-widest text-tech-main transition-all hover:guide-line hover:bg-white hover:text-tech-main hover:shadow-sm"
                    disabled={isReadOnly}
                    onClick={() =>
                      insertTextAtCursor(
                        "\n| Parameter | Value | Notes |\n| --- | --- | --- |\n| Example | Value | Detail |\n\n"
                      )
                    }>
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-tech-main/40">||</span>{" "}
                      TABLE
                    </span>
                  </TechButton>

                  <div className="mx-2 h-4 w-px bg-tech-main/20" />

                  <TechButton
                    type="button"
                    variant="secondary"
                    className="group h-7 guide-line bg-white/50 px-3 text-[10px] font-bold tracking-widest text-tech-main-dark/80 transition-all hover:border-tech-main/50 hover:bg-white"
                    disabled={
                      isReadOnly || !activeFileHistory?.undoStack.length
                    }
                    onClick={handleUndoDraftEdit}>
                    <span className="flex items-center gap-1">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="square">
                        <path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3z" />
                      </svg>
                      UNDO
                    </span>
                  </TechButton>
                  <TechButton
                    type="button"
                    variant="secondary"
                    className="group h-7 guide-line bg-white/50 px-3 text-[10px] font-bold tracking-widest text-tech-main-dark/80 transition-all hover:border-tech-main/50 hover:bg-white"
                    disabled={
                      isReadOnly || !activeFileHistory?.redoStack.length
                    }
                    onClick={handleRedoDraftEdit}>
                    <span className="flex items-center gap-1">
                      REDO
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="square"
                        className="scale-x-[-1]">
                        <path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3z" />
                      </svg>
                    </span>
                  </TechButton>
                </div>
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
                  onUndo={handleUndoDraftEdit}
                  onRedo={handleRedoDraftEdit}
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
                  placeholder={t("contentPlaceholder")}
                  lineWrap={lineWrap}
                  canUndo={Boolean(activeFileHistory?.undoStack.length)}
                  canRedo={Boolean(activeFileHistory?.redoStack.length)}
                  enableSyntaxHints
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

      <section
        className="
          grid gap-4
          xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]
        ">
        <div className="border border-tech-main/35 bg-white/80 backdrop-blur-sm">
          <div className="flex border-b guide-line">
            <button
              type="button"
              onClick={() => setActiveInfoTab("changes")}
              className={`flex-1 px-4 py-3 font-mono text-xs tracking-widest uppercase ${
                activeInfoTab === "changes"
                  ? "bg-tech-main text-white"
                  : "text-tech-main hover:bg-tech-main/5"
              }`}>
              CHANGE MAP
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoTab("guide")}
              className={`flex-1 border-l guide-line px-4 py-3 font-mono text-xs tracking-widest uppercase ${
                activeInfoTab === "guide"
                  ? "bg-tech-main text-white"
                  : "text-tech-main hover:bg-tech-main/5"
              }`}>
              CONTRIBUTING
            </button>
          </div>

          {activeInfoTab === "changes" ? (
            <div className="space-y-4 p-4">
              <div
                className="
                  grid gap-3
                  sm:grid-cols-3
                ">
                <InfoStat
                  label="MODIFIED FILES"
                  value={String(
                    changeEntries.filter(
                      (entry) => entry && entry.changeType === "modified"
                    ).length
                  )}
                />
                <InfoStat
                  label="NEW FILES"
                  value={String(
                    changeEntries.filter(
                      (entry) => entry && entry.changeType === "new"
                    ).length
                  )}
                />
                <InfoStat
                  label="NEW FOLDERS"
                  value={String((draftCollection.folders || []).length)}
                />
              </div>

              {changeEntries.length === 0 ? (
                <p
                  className="
                    border guide-line bg-tech-main/5 p-4 font-mono text-xs
                    text-tech-main/60 uppercase
                  ">
                  NO_LOCAL_DIFF_
                </p>
              ) : (
                <div className="space-y-4">
                  {changeEntries.map((entry) =>
                    entry ? (
                      <ChangePreviewCard
                        key={entry.file.id}
                        filePath={entry.file.filePath || "PATH_NOT_SET"}
                        changeType={entry.changeType}
                        rows={entry.rows}
                      />
                    ) : null
                  )}
                </div>
              )}

              {newFolderPaths.length > 0 ? (
                <div className="border guide-line bg-tech-main/5 p-4">
                  <p className="section-label">NEW FOLDERS</p>
                  <div className="space-y-1 font-mono text-xs text-emerald-700">
                    {newFolderPaths.map((folderPath) => (
                      <p key={folderPath}>+ {folderPath}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-4">
              {contributingGuides.length === 0 ? (
                <p className="font-mono text-xs text-tech-main/60 uppercase">
                  NO_GUIDE_AVAILABLE_
                </p>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {contributingGuides.map((guide) => (
                      <TechButton
                        key={guide.id}
                        type="button"
                        variant={
                          activeGuideId === guide.id ? "primary" : "secondary"
                        }
                        size="sm"
                        onClick={() => setActiveGuideId(guide.id)}>
                        {guide.title}
                      </TechButton>
                    ))}
                  </div>
                  <div className="max-h-136 overflow-y-auto pr-2">
                    <LazyMarkdownPreview
                      content={
                        contributingGuides.find(
                          (guide) => guide.id === activeGuideId
                        )?.content || contributingGuides[0].content
                      }
                      rawPath="CONTRIBUTING.md"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="border border-tech-main/35 bg-white/80 p-4 backdrop-blur-sm">
          <p className="section-label">WORKSPACE OVERVIEW</p>
          <div className="space-y-3 font-mono text-xs uppercase">
            <InfoLine
              label="OPEN FILES"
              value={String(draftCollection.files.length)}
            />
            <InfoLine
              label="FOLDERS"
              value={String((draftCollection.folders || []).length)}
            />
            <InfoLine
              label="UNSAVED FILES"
              value={String(unsavedFileIds.size)}
            />
            <InfoLine
              label="ACTIVE FILE"
              value={activeFile.filePath || "PATH_NOT_SET"}
            />
            <InfoLine
              label="GITHUB BASE"
              value={describeSnapshotStatus(repoSnapshots[activeFile.id])}
            />
          </div>
        </div>
      </section>

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
              {isSaving
                ? t("savingLabel")
                : hasUnsavedChanges
                  ? `${t("saveButton")}_*`
                  : t("saveButton")}
            </TechButton>

            <TechButton
              type="button"
              variant="ghost"
              onClick={handleSubmitReview}
              disabled={submitDisabled}
              aria-busy={isSubmittingReview}>
              {isSubmittingReview ? progressT("submitBusy") : t("openPr")}
            </TechButton>
          </div>

          <section
            aria-label={t("submissionLicenseAria")}
            className="mt-4 border guide-line bg-tech-main/5 p-4 font-mono text-[0.6875rem] leading-relaxed text-tech-main/80">
            <div className="mb-3 border-b border-tech-main/15 pb-3">
              <p className="section-label">{t("syntaxHintsTitle")}</p>
              <p className="mt-2 text-tech-main/70">
                {t("syntaxHintsDescription")}
              </p>
              <p className="mt-1 text-tech-main/55">
                {t("syntaxHintsShortcut")}
              </p>
            </div>
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
        isOpen={fileDialogIntent !== null}
        initialFolderPath={getParentFolderPath(activeFile.filePath)}
        initialMode={fileDialogIntent?.initialMode}
        onClose={() => setFileDialogIntent(null)}
        onCreate={handleApplyDraftFileSource}
        onCreateFolder={handleCreateFolder}
      />

      <DraftFileSourceDialog
        isOpen={insertDialogIntent}
        initialFolderPath={getParentFolderPath(activeFile.filePath)}
        initialMode="repo"
        onClose={() => setInsertDialogIntent(false)}
        onCreate={handleInsertSelectedFile}
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

function buildDiffRows(previousContent: string, nextContent: string) {
  const rows: DraftDiffRow[] = []
  let oldLine = 1
  let newLine = 1

  for (const part of diffLines(previousContent, nextContent)) {
    const values = part.value.replace(/\n$/, "").split("\n")

    if (!part.added && !part.removed && values.length > 6) {
      for (const line of values.slice(0, 2)) {
        rows.push({ newLine, oldLine, type: "context", value: line })
        oldLine += 1
        newLine += 1
      }

      rows.push({
        newLine: null,
        oldLine: null,
        type: "skipped",
        value: `${values.length - 4} unchanged lines`,
      })

      for (const line of values.slice(-2)) {
        rows.push({ newLine, oldLine, type: "context", value: line })
        oldLine += 1
        newLine += 1
      }
      continue
    }

    for (const line of values) {
      rows.push({
        newLine: part.removed ? null : newLine,
        oldLine: part.added ? null : oldLine,
        type: part.added ? "add" : part.removed ? "remove" : "context",
        value: line,
      })

      if (!part.added) {
        oldLine += 1
      }

      if (!part.removed) {
        newLine += 1
      }
    }
  }

  return rows
}

function describeSnapshotStatus(snapshot?: RepoFileSnapshot) {
  if (!snapshot) return "CHECKING"
  if (snapshot.status === "missing") return "NEW_FILE"
  if (snapshot.status === "loading") return "LOADING"
  if (snapshot.status === "error") return "UNKNOWN"
  return "TRACKED"
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border guide-line bg-tech-main/5 p-3">
      <p className="font-mono text-[0.6875rem] tracking-widest text-tech-main/55 uppercase">
        {label}
      </p>
      <p className="mt-2 font-mono text-lg text-tech-main uppercase">{value}</p>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-tech-main/10 pb-2">
      <span className="text-tech-main/55">{label}</span>
      <span className="text-right break-all text-tech-main">{value}</span>
    </div>
  )
}

function ChangePreviewCard({
  filePath,
  changeType,
  rows,
}: {
  filePath: string
  changeType: "modified" | "new" | "pending"
  rows: DraftDiffRow[]
}) {
  return (
    <section className="border guide-line bg-white/70">
      <div className="flex items-center justify-between border-b guide-line bg-tech-main/5 px-4 py-3">
        <p className="font-mono text-xs tracking-widest break-all text-tech-main uppercase">
          {filePath}
        </p>
        <span
          className={`
            border px-2 py-1 font-mono text-[0.625rem] tracking-widest uppercase
            ${
              changeType === "new"
                ? `border-emerald-500/30 text-emerald-700`
                : changeType === "modified"
                  ? `border-amber-500/30 text-amber-700`
                  : `guide-line text-tech-main/55`
            }
          `}>
          {changeType}
        </span>
      </div>

      <div className="max-h-72 overflow-auto bg-slate-950/95 font-mono text-[0.6875rem] text-slate-100">
        {rows.map((row, index) => (
          <div
            key={`${filePath}-${index}`}
            className={`
              grid grid-cols-[3rem_3rem_minmax(0,1fr)] px-2 py-1
              ${
                row.type === "add"
                  ? `bg-emerald-500/10 text-emerald-200`
                  : row.type === "remove"
                    ? `bg-red-500/10 text-red-200`
                    : row.type === "skipped"
                      ? `bg-slate-800/70 text-slate-400`
                      : `text-slate-300`
              }
            `}>
            <span className="text-slate-500">{row.oldLine ?? ""}</span>
            <span className="text-slate-500">{row.newLine ?? ""}</span>
            <span className="break-all whitespace-pre-wrap">
              {row.type === "skipped" ? `… ${row.value}` : row.value || " "}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
