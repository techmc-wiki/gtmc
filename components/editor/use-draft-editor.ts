"use client"

import * as React from "react"
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { saveDraftAction } from "@/actions/article-draft"
import { submitDraftAction } from "@/actions/article-submit"
import {
  getActiveDraftFile,
  getDuplicateDraftFilePaths,
  normalizeDraftFileCollection,
  normalizeDraftFilePath,
  serializeDraftFilesPayload,
  type DraftFileCollection,
} from "@/lib/drafts/files"
import { toast } from "sonner"
import { useDraftImageUpload } from "@/hooks/use-draft-image-upload"
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

interface DraftEditorInitialData {
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

function normalizeDraftEditorInput(initialData?: DraftEditorInitialData) {
  return {
    activeGuideId: initialData?.contributingGuides?.[0]?.id || "",
    collection: normalizeDraftFileCollection({
      activeFileId: initialData?.activeFileId,
      folders: initialData?.folders || [],
      files: initialData?.files || [],
    }),
    contributingGuides: initialData?.contributingGuides || [],
    githubPrUrl: initialData?.githubPrUrl,
    revisionId: initialData?.id,
    status: initialData?.status || "DRAFT",
    title: initialData?.title || "",
  }
}

export function useDraftEditor(initialData?: DraftEditorInitialData) {
  const router = useRouter()
  const t = useTranslations("Editor")
  const progressT = useTranslations("OperationProgress")
  const {
    activeGuideId: initialGuideId,
    collection: initialDraftCollection,
    contributingGuides,
    githubPrUrl,
    revisionId: initialRevisionId,
    status: initialStatus,
    title: initialTitle,
  } = normalizeDraftEditorInput(initialData)

  const [draftStatus, setDraftStatus] = React.useState(initialStatus)
  const [title, setTitle] = React.useState(initialTitle)
  const [draftCollection, setDraftCollection] = React.useState(
    initialDraftCollection
  )
  const [lastSavedDraftCollection, setLastSavedDraftCollection] =
    React.useState(initialDraftCollection)
  const [lastSavedTitle, setLastSavedTitle] = React.useState(initialTitle)
  const [revisionId, setRevisionId] = React.useState<string | undefined>(
    initialRevisionId
  )
  const [fileDialogIntent, setFileDialogIntent] =
    React.useState<DraftFileDialogIntent | null>(null)
  const [pendingSaveCount, setPendingSaveCount] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [saveProgressState, setSaveProgressState] =
    React.useState<OperationProgressState>("idle")
  const [submitProgressState, setSubmitProgressState] =
    React.useState<OperationProgressState>("idle")
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<TabType>("write")
  const [lineWrap, setLineWrap] = React.useState(false)
  const [activeInfoTab, setActiveInfoTab] = React.useState<"changes" | "guide">(
    "changes"
  )
  const [activeGuideId, setActiveGuideId] = React.useState(initialGuideId)
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
  const revisionIdRef = React.useRef<string | undefined>(initialRevisionId)
  const saveQueueRef = React.useRef<Promise<unknown> | null>(null)
  const submissionInFlightRef = React.useRef(false)

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

  const isSaving = pendingSaveCount > 0
  const isReadOnly = draftStatus !== "DRAFT"
  const activeFile = getActiveDraftFile(draftCollection)
  const activeFileContent = activeFile.content
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
        previous.redoCount === nextAvailability.redoCount
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
    const snapshot = {
      draftCollection: normalizedDraftCollection,
      title,
    }

    setPendingSaveCount((count) => count + 1)
    const previousSave = saveQueueRef.current || Promise.resolve()
    const saveTask = previousSave.then(async () => {
      const primaryFile = getActiveDraftFile(snapshot.draftCollection)
      const formData = new FormData()
      formData.append("title", snapshot.title)
      formData.append("activeFileId", snapshot.draftCollection.activeFileId)
      formData.append("content", primaryFile.content)
      formData.append(
        "draftFiles",
        serializeDraftFilesPayload(snapshot.draftCollection)
      )
      formData.append("filePath", primaryFile.filePath)
      if (revisionIdRef.current) {
        formData.append("revisionId", revisionIdRef.current)
      }

      const result = await saveDraftAction(formData)
      if (!result.success || !result.revisionId) {
        throw new Error("Failed to save draft")
      }

      revisionIdRef.current = result.revisionId
      setLastSavedDraftCollection(snapshot.draftCollection)
      setLastSavedTitle(snapshot.title)
      setRevisionId(result.revisionId)
      return { revisionId: result.revisionId }
    })

    saveQueueRef.current = saveTask.catch(() => undefined)
    try {
      return await saveTask
    } finally {
      setPendingSaveCount((count) => Math.max(0, count - 1))
    }
  }, [draftCollection, title])

  const saveDraftWithFeedback = React.useCallback(
    async (mode: "manual" | "auto" = "manual") => {
      if (!title.trim()) return
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
      if (mode === "manual") {
        setSaveError(null)
        updateSaveProgressState("running")
      }
      try {
        await persistDraft()
        if (mode === "manual") {
          updateSaveProgressState("success")
          toast.success(t("badgeDraftSaved"))
        }
      } catch (error) {
        console.error(error)
        setSaveError(t("badgeSaveFailed"))
        if (mode === "manual") {
          updateSaveProgressState("error")
          toast.error(t("badgeSaveFailed"))
        }
      }
    },
    [persistDraft, t, title]
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
      const currentRevisionId = revisionIdRef.current
      if (!currentRevisionId) {
        throw new Error("Save draft first before uploading files.")
      }
      const formData = new FormData()
      formData.append("file", file)
      formData.append("revisionId", currentRevisionId)
      const res = await fetch("/api/upload/draft", {
        method: "POST",
        body: formData,
      })
      if (res.status === 413) throw new Error(t("errorFileTooLarge"))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("errorUploadFailed"))
      return { url: data.url, filename: data.filename }
    },
    [t]
  )

  const { uploadFile, isUploading, isCompressing } = useDraftImageUpload({
    upload: draftUploadAdapter,
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
  })

  React.useEffect(() => {
    if (isReadOnly || !title.trim() || !hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
      return
    }
    if (isSaving || isSubmitting || isUploading) return
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
    isSubmitting,
    isUploading,
    saveDraftWithFeedback,
    title,
  ])

  React.useEffect(() => {
    if (isReadOnly || !hasUnsavedChanges) return
    const warnBeforeExit = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = true
    }
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden" && !isUploading) {
        void saveDraftWithFeedback("auto")
      }
    }
    window.addEventListener("beforeunload", warnBeforeExit)
    document.addEventListener("visibilitychange", saveWhenHidden)
    return () => {
      window.removeEventListener("beforeunload", warnBeforeExit)
      document.removeEventListener("visibilitychange", saveWhenHidden)
    }
  }, [hasUnsavedChanges, isReadOnly, isUploading, saveDraftWithFeedback])

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
      if (isSaving || isSubmitting || isUploading || !title.trim()) return
      void saveDraftWithFeedback("manual")
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    isReadOnly,
    isSaving,
    isSubmitting,
    isUploading,
    saveDraftWithFeedback,
    title,
  ])

  const handleUploadWithAutoSave = async (file: File) => {
    if (!revisionIdRef.current) {
      const savingToastId = toast.loading(t("badgeSavingBeforeUpload"))
      updateSaveProgressState("running")
      try {
        await persistDraft()
        updateSaveProgressState("success")
        toast.dismiss(savingToastId)
      } catch {
        updateSaveProgressState("error")
        toast.dismiss(savingToastId)
        toast.error(t("badgeSaveFailedUpload"))
        return
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
      handleUploadWithAutoSave(e.dataTransfer.files[0])
    }
  }

  const saveDraft = () => {
    void saveDraftWithFeedback("manual")
  }

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveDraftWithFeedback("manual")
  }
  const handleSubmitDraft = async () => {
    if (
      isReadOnly ||
      submissionInFlightRef.current ||
      isSaving ||
      isUploading
    ) {
      return
    }
    if (hasMissingFilePath) {
      toast.error(t("badgeAllFilesNeedPath"), { duration: 4000 })
      return
    }
    if (duplicateFilePaths.length > 0) {
      toast.error(
        t("duplicatePathsError", { paths: duplicateFilePaths.join(", ") }),
        { duration: 4000 }
      )
      return
    }
    submissionInFlightRef.current = true
    setIsSubmitting(true)
    updateSubmitProgressState("running")
    try {
      const persistedDraft = await persistDraft()
      const result = await submitDraftAction(persistedDraft.revisionId)
      setDraftStatus(result.status)
      updateSubmitProgressState("success")
      toast.success(t("badgePrOpened"), { duration: 4000 })
      router.push(`/draft/${persistedDraft.revisionId}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      updateSubmitProgressState("error")
      toast.error(t("badgeSubmitFailed"))
    } finally {
      submissionInFlightRef.current = false
      setIsSubmitting(false)
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
    let cancelled = false
    const controller = new AbortController()
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
      void (async () => {
        try {
          const response = await fetch(
            `/api/draft/repo-file?path=${encodeURIComponent(normalizedPath)}`,
            { cache: "no-store", signal: controller.signal }
          )
          if (cancelled) return
          if (response.status === 404) {
            if (!cancelled) {
              setRepoSnapshots((current) => ({
                ...current,
                [file.id]: {
                  content: null,
                  filePath: normalizedPath,
                  status: "missing",
                },
              }))
            }
            return
          }
          const data = (await response.json()) as {
            content?: string
            error?: string
          }
          if (cancelled) return
          if (!response.ok || typeof data.content !== "string") {
            throw new Error(data.error || "Failed to load repository file")
          }
          if (!cancelled) {
            setRepoSnapshots((current) => ({
              ...current,
              [file.id]: {
                content: data.content ?? "",
                filePath: normalizedPath,
                status: "loaded",
              },
            }))
          }
        } catch (error: unknown) {
          if (cancelled) return
          if (error instanceof DOMException && error.name === "AbortError") {
            return
          }
          if (!cancelled) {
            setRepoSnapshots((current) => ({
              ...current,
              [file.id]: {
                content: null,
                filePath: normalizedPath,
                status: "error",
              },
            }))
          }
        }
      })()
    }
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [draftCollection.files, repoSnapshots])

  const saveDisabled = isSaving || !title.trim()
  const activeFileHistoryAvailability =
    historyAvailability[draftCollection.activeFileId]
  const submitDisabled =
    isSubmitting ||
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
      isSubmitting,
      saveError,
      saveProgressState,
      submitProgressState,
      activeTab,
      lineWrap,
      activeInfoTab,
      activeGuideId,
      repoSnapshots,
      insertDialogIntent,
      githubPrUrl,
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
      saveDraft,
      handleSubmitDraft,
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
    progress: { saveProgressStages, submitProgressStages },
    t,
    progressT,
  }
}
