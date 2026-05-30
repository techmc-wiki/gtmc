"use client"

import * as React from "react"
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { saveDraftAction } from "@/actions/article-draft"
import { submitForReviewAction } from "@/actions/article-submit"
import {
  getActiveDraftFile,
  getDuplicateDraftFilePaths,
  normalizeDraftFileCollection,
  normalizeDraftFilePath,
  serializeDraftFilesPayload,
  type DraftFileCollection,
} from "@/lib/drafts/files"
import { useStatusNotification } from "@/hooks/use-status-notification"
import { useEditorUpload } from "@/hooks/use-editor-upload"
import type { OperationProgressState } from "@/components/ui/operation-progress"
import type { SourceMode } from "@/components/editor/draft-file-source-dialog"
import type { TabType } from "@/components/editor/editor-tab-strip"

const MAX_DRAFT_HISTORY_ENTRIES = 100

interface DraftContentHistory {
  undoStack: string[]
  redoStack: string[]
}

interface DraftHistoryAvailability {
  redoCount: number
  undoCount: number
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

export function useDraftEditor(initialData?: {
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
}) {
  const router = useRouter()
  const t = useTranslations("Editor")
  const progressT = useTranslations("OperationProgress")
  const initialStatus = initialData?.status || "DRAFT"
  const initialDraftCollection = normalizeDraftFileCollection({
    activeFileId: initialData?.activeFileId,
    folders: initialData?.folders || [],
    files: initialData?.files || [],
  })

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
  const [historyAvailability, setHistoryAvailability] = React.useState<
    Record<string, DraftHistoryAvailability>
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
  const repoSnapshotRequestsRef = React.useRef<Record<string, string>>({})
  const { badge, showBadge, clearBadge } = useStatusNotification()

  const saveProgressStages = React.useMemo(
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

  const submitProgressStages = React.useMemo(
    () => [
      {
        id: "preflight",
        label: progressT("submitStagePreflight"),
        durationMs: 260,
      },
      { id: "assets", label: progressT("submitStageAssets"), durationMs: 580 },
      {
        id: "migrate",
        label: progressT("submitStageMigrate"),
        durationMs: 760,
      },
      { id: "open-pr", label: progressT("submitStagePr"), durationMs: 920 },
      {
        id: "refresh",
        label: progressT("submitStageRefresh"),
        durationMs: 300,
      },
    ],
    [progressT]
  )

  React.useEffect(
    () => () => {
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
      }
      if (saveProgressResetRef.current !== null) {
        window.clearTimeout(saveProgressResetRef.current)
      }
      if (submitProgressResetRef.current !== null) {
        window.clearTimeout(submitProgressResetRef.current)
      }
    },
    []
  )

  const updateSaveProgressState = (
    nextState: Exclude<OperationProgressState, "idle">
  ) => {
    if (saveProgressResetRef.current !== null) {
      window.clearTimeout(saveProgressResetRef.current)
      saveProgressResetRef.current = null
    }
    setSaveProgressState(nextState)
    if (nextState === "running") return
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
    if (nextState === "running") return
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
    if (existingHistory) return existingHistory
    const nextHistory: DraftContentHistory = { undoStack: [], redoStack: [] }
    contentHistoryRef.current[fileId] = nextHistory
    return nextHistory
  }, [])

  const syncHistoryAvailability = React.useCallback((fileId: string) => {
    const history = contentHistoryRef.current[fileId]
    const nextAvailability: DraftHistoryAvailability = {
      undoCount: history?.undoStack.length ?? 0,
      redoCount: history?.redoStack.length ?? 0,
    }
    setHistoryAvailability((current) => {
      const previous = current[fileId]
      if (
        previous?.undoCount === nextAvailability.undoCount &&
        previous?.redoCount === nextAvailability.redoCount
      ) {
        return current
      }
      return { ...current, [fileId]: nextAvailability }
    })
  }, [])

  const pushHistoryEntry = React.useCallback(
    (stack: string[], value: string) => {
      if (stack[stack.length - 1] === value) return
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
        if (!targetFile || targetFile.content === nextContent) return current
        const history = getDraftContentHistory(fileId)
        if (mode === "record") {
          pushHistoryEntry(history.undoStack, targetFile.content)
          history.redoStack = []
        } else if (mode === "undo") {
          pushHistoryEntry(history.redoStack, targetFile.content)
        } else {
          pushHistoryEntry(history.undoStack, targetFile.content)
        }
        syncHistoryAvailability(fileId)
        return {
          ...current,
          files: current.files.map((file) =>
            file.id === fileId ? { ...file, content: nextContent } : file
          ),
        }
      })
    },
    [getDraftContentHistory, pushHistoryEntry, syncHistoryAvailability]
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
    if (revisionId) formData.append("revisionId", revisionId)

    const result = await saveDraftAction(formData)
    if (!result.success || !result.revisionId) {
      throw new Error("Failed to save draft")
    }

    setDraftCollection(normalizedDraftCollection)
    setLastSavedDraftCollection(normalizedDraftCollection)
    setLastSavedTitle(title)
    setRevisionId(result.revisionId)

    return { normalizedDraftCollection, revisionId: result.revisionId }
  }, [draftCollection, revisionId, title])

  const saveDraftWithFeedback = React.useCallback(
    async (mode: "manual" | "auto" = "manual") => {
      if (isSaving || !title.trim()) return
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
      setIsSaving(true)
      if (mode === "manual") updateSaveProgressState("running")
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
    if (isReadOnly) return
    const history = contentHistoryRef.current[draftCollection.activeFileId]
    const previousContent = history?.undoStack.pop()
    syncHistoryAvailability(draftCollection.activeFileId)
    if (previousContent === undefined) return
    updateFileContent(draftCollection.activeFileId, previousContent, "undo")
  }, [
    draftCollection.activeFileId,
    isReadOnly,
    syncHistoryAvailability,
    updateFileContent,
  ])

  const handleRedoDraftEdit = React.useCallback(() => {
    if (isReadOnly) return
    const history = contentHistoryRef.current[draftCollection.activeFileId]
    const nextContent = history?.redoStack.pop()
    syncHistoryAvailability(draftCollection.activeFileId)
    if (nextContent === undefined) return
    updateFileContent(draftCollection.activeFileId, nextContent, "redo")
  }, [
    draftCollection.activeFileId,
    isReadOnly,
    syncHistoryAvailability,
    updateFileContent,
  ])

  const insertTextAtCursor = (text: string) => {
    if (!textareaRef.current) return
    const view = textareaRef.current.view
    if (!view) return
    const selection = view.state.selection.main
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: text },
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
      changes: { from: selection.from, to: selection.to, insert: newText },
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
      if (res.status === 413) throw new Error(t("errorFileTooLarge"))
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
          content: activeFileContent.replaceAll(
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
    if (isSaving || isSubmittingReview || isUploading) return
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
    if (isReadOnly) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "s"
      ) {
        return
      }
      event.preventDefault()
      if (isSubmittingReview || isUploading || !title.trim()) return
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
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) handleUploadWithAutoSave(file)
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
      if (isReadOnly) return
      setFileDialogIntent({ kind, initialMode })
    },
    [isReadOnly]
  )

  React.useEffect(() => {
    const pendingFiles = draftCollection.files.filter((file) => {
      const normalizedPath = normalizeDraftFilePath(file.filePath)
      if (!normalizedPath) return false
      const snapshot = repoSnapshots[file.id]
      return (
        (!snapshot || snapshot.filePath !== normalizedPath) &&
        repoSnapshotRequestsRef.current[file.id] !== normalizedPath
      )
    })
    for (const file of pendingFiles) {
      const normalizedPath = normalizeDraftFilePath(file.filePath)
      if (!normalizedPath) continue
      repoSnapshotRequestsRef.current[file.id] = normalizedPath
      void fetch(
        `/api/draft/repo-file?path=${encodeURIComponent(normalizedPath)}`,
        { cache: "no-store" }
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

  const saveDisabled = isSaving || !title.trim()
  const activeFileHistoryAvailability =
    historyAvailability[draftCollection.activeFileId]
  const submitDisabled =
    isSubmittingReview ||
    isSaving ||
    isUploading ||
    !title.trim() ||
    hasMissingFilePath ||
    duplicateFilePaths.length > 0

  return {
    state: {
      draftStatus,
      title,
      draftCollection,
      revisionId,
      fileDialogIntent,
      isSaving,
      isSubmittingReview,
      saveProgressState,
      submitProgressState,
      activeTab,
      lineWrap,
      activeInfoTab,
      activeGuideId,
      repoSnapshots,
      insertDialogIntent,
      githubPrUrl,
      isSyncConflict,
      isReadOnly,
      activeFile,
      activeFileContent,
      duplicateFilePaths,
      hasMissingFilePath,
      activeFileHasDuplicatePath,
      activeFileIndex,
      contributingGuides,
      unsavedFileIds,
      hasUnsavedChanges,
      saveDisabled,
      activeFileHistoryAvailability,
      submitDisabled,
    },
    refs: { textareaRef, fileInputRef },
    actions: {
      setTitle,
      setDraftCollection,
      setFileDialogIntent,
      setActiveTab,
      setLineWrap,
      setActiveInfoTab,
      setActiveGuideId,
      setInsertDialogIntent,
      updateDraftCollection,
      updateActiveFile,
      updateFileById,
      handleSaveDraft,
      handleSubmitReview,
      handleUndoDraftEdit,
      handleRedoDraftEdit,
      handlePaste,
      handleDrop,
      handleUploadWithAutoSave,
      insertTextAtCursor,
      insertSyntax,
      openFileDialog,
    },
    upload: { uploadFile, isUploading, isCompressing },
    badge: { badge, showBadge, clearBadge },
    progress: { saveProgressStages, submitProgressStages },
    t,
    progressT,
  }
}
