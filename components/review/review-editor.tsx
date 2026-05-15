"use client"

import * as React from "react"
import ReactDOM from "react-dom"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror"

import {
  EditorTabStrip,
  type TabType,
} from "@/components/editor/editor-tab-strip"
import { EditorTextarea } from "@/components/editor/editor-textarea"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { LazyMarkdownPreview } from "@/components/editor/lazy-markdown-preview"
import { ReviewDiffPanel } from "@/components/review/review-diff-panel"
import { ReviewFileList } from "@/components/review/review-file-list"
import { ModeSelector } from "@/components/review/mode-selector"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { type OperationProgressState } from "@/components/ui/operation-progress"
import { RebaseProgress } from "@/components/review/rebase-progress"
import {
  selectModeAction,
  abortResolutionAction,
  finalizeReviewAction,
  resolveConflictAction,
} from "@/actions/review"
import {
  normalizeDraftFileCollection,
  serializeDraftFilesPayload,
} from "@/lib/draft-files"
import { getReauthLoginUrl, isReauthRequiredError } from "@/lib/admin-reauth"
import type {
  ConflictMode,
  ModeAnalysis,
  ReviewMergeStrategyAnalysis,
  ReviewFile,
  ReviewMergeMethod,
  ReviewSessionState,
} from "@/types/review"
import type { RebaseState } from "@/types/rebase"
import { useMounted } from "@/hooks/use-mounted"

const CONFLICT_BLOCK_REGEX =
  /<<<<<<< draft\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> main\n?/g

type EditorSegment =
  | { type: "text"; id: string; content: string }
  | {
      type: "conflict"
      id: string
      marker: string
      ours: string
      theirs: string
    }

function parseEditorSegments(content: string): EditorSegment[] {
  const segments: EditorSegment[] = []
  let lastIndex = 0
  let conflictIndex = 0

  for (const match of content.matchAll(CONFLICT_BLOCK_REGEX)) {
    const marker = match[0]
    const start = match.index ?? 0
    const precedingText = content.slice(lastIndex, start)

    if (precedingText) {
      segments.push({
        type: "text",
        id: `text-${conflictIndex}`,
        content: precedingText,
      })
    }

    segments.push({
      type: "conflict",
      id: `conflict-${conflictIndex}`,
      marker,
      ours: match[1] ?? "",
      theirs: match[2] ?? "",
    })

    lastIndex = start + marker.length
    conflictIndex += 1
  }

  const trailingText = content.slice(lastIndex)
  if (trailingText || segments.length === 0) {
    segments.push({
      type: "text",
      id: `text-${conflictIndex}`,
      content: trailingText,
    })
  }

  return segments
}

function serializeEditorSegments(segments: EditorSegment[]) {
  return segments
    .map((segment) =>
      segment.type === "text" ? segment.content : segment.marker
    )
    .join("")
}

function fileHasConflicts(file: ReviewFile, content: string) {
  return (
    file.status === "conflict" ||
    Boolean(file.conflictContent) ||
    content.match(CONFLICT_BLOCK_REGEX) !== null
  )
}

function resolveFileStatus(
  file: ReviewFile,
  content: string
): ReviewFile["status"] {
  const startedWithConflict =
    file.status === "conflict" || Boolean(file.conflictContent)

  if (content.match(CONFLICT_BLOCK_REGEX)) {
    return "conflict"
  }

  return startedWithConflict ? "resolved" : "clean"
}

function getFirstConflictedFile(
  files: ReviewFile[],
  fileContents: Record<string, string>
) {
  return (
    files.find((file) =>
      fileHasConflicts(file, fileContents[file.id] ?? file.content)
    ) ?? null
  )
}

function inferMode(revision: {
  conflictMode: string | null
  rebaseState: unknown
}): ConflictMode | null {
  if (revision.conflictMode) {
    return revision.conflictMode as ConflictMode
  }

  const rebaseState = revision.rebaseState as { status?: string } | null

  if (
    rebaseState?.status &&
    rebaseState.status !== "IDLE" &&
    rebaseState.status !== "ABORTED"
  ) {
    return "FINE_GRAINED"
  }

  return null
}

interface ReviewEditorProps {
  pr: {
    number: number
    title: string
    htmlUrl: string
    baseRef: string
    headRef: string
    commits: number
    changedFiles: number
    additions: number
    deletions: number
    authorLogin: string
  }
  files: ReviewFile[]
  initialActiveFileId?: string
  modeAnalysis: ModeAnalysis
  mergeStrategyAnalysis: ReviewMergeStrategyAnalysis
  revision: { id: string; conflictMode: string | null; rebaseState: unknown }
  squashCommitDefaults?: {
    title: string
    body: string
    coauthorLines: string[]
  }
}

interface ReviewActionDraftSnapshot {
  activeFileId: string
  files: Array<{
    id: string
    filePath: string
    content: string
    conflictContent?: string | null
  }>
}

export function ReviewEditor({
  pr,
  files,
  initialActiveFileId,
  modeAnalysis,
  mergeStrategyAnalysis,
  revision,
  squashCommitDefaults,
}: ReviewEditorProps) {
  const t = useTranslations("Review")
  const router = useRouter()
  const [reviewSession, setReviewSession] = React.useState<ReviewSessionState>(
    () => ({
      mode: inferMode(revision),
      files,
      activeFileId: initialActiveFileId ?? files[0]?.id ?? "",
      modeAnalysis,
    })
  )

  const [activeTab, setActiveTab] = React.useState<TabType>(() =>
    files.some((file) => Boolean(file.conflictContent)) ? "3-way" : "diff"
  )
  const [lineWrap, setLineWrap] = React.useState(false)

  const [fileContents, setFileContents] = React.useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(files.map((f) => [f.id, f.conflictContent ?? f.content]))
  )

  const [isSelectingMode, setIsSelectingMode] = React.useState(false)
  const [isAborting, setIsAborting] = React.useState(false)
  const [isFinalizing, setIsFinalizing] = React.useState(false)
  const [finalizeProgressState, setFinalizeProgressState] =
    React.useState<OperationProgressState>("idle")
  const [isBranchSyncing, setIsBranchSyncing] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [actionNotice, setActionNotice] = React.useState<{
    tone: "info" | "success" | "warning"
    message: string
  } | null>(null)
  const abortedRef = React.useRef(false)
  const autosaveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const finalizeProgressResetRef = React.useRef<number | null>(null)
  const pendingServerRefreshRef = React.useRef(false)
  const conflictFocusPathRef = React.useRef<string | null>(null)
  const conflictAutoScrollRef = React.useRef(false)
  const firstConflictAnchorRef = React.useRef<HTMLDivElement | null>(null)
  const lastConflictSignatureRef = React.useRef<string | null>(null)
  const isMounted = useMounted()

  const textareaRef = React.useRef<ReactCodeMirrorRef>(null)

  React.useEffect(() => {
    setReviewSession((prev) => {
      const fallbackActiveFileId = initialActiveFileId ?? files[0]?.id ?? ""
      const nextActiveFileId = pendingServerRefreshRef.current
        ? fallbackActiveFileId
        : files.some((file) => file.id === prev.activeFileId)
          ? prev.activeFileId
          : fallbackActiveFileId

      return {
        ...prev,
        files,
        modeAnalysis,
        activeFileId: nextActiveFileId,
      }
    })
  }, [files, initialActiveFileId, modeAnalysis])

  React.useEffect(() => {
    setFileContents((prev) => {
      if (pendingServerRefreshRef.current) {
        pendingServerRefreshRef.current = false
        return Object.fromEntries(
          files.map((file) => [file.id, file.conflictContent ?? file.content])
        )
      }

      const next = { ...prev }

      for (const f of files) {
        if (!(f.id in prev)) {
          next[f.id] = f.conflictContent ?? f.content
        }
      }

      return next
    })
  }, [files])

  const sessionFiles = React.useMemo(
    () =>
      reviewSession.files.map((file) => {
        const content = fileContents[file.id] ?? file.content

        return {
          ...file,
          content,
          status: resolveFileStatus(file, content),
        }
      }),
    [fileContents, reviewSession.files]
  )
  const sessionFilesRef = React.useRef(sessionFiles)
  const activeFileIdRef = React.useRef(reviewSession.activeFileId)

  React.useEffect(() => {
    sessionFilesRef.current = sessionFiles
  }, [sessionFiles])

  React.useEffect(() => {
    activeFileIdRef.current = reviewSession.activeFileId
  }, [reviewSession.activeFileId])

  const activeFile =
    sessionFiles.find((f) => f.id === reviewSession.activeFileId) ??
    sessionFiles[0]

  const activeContent =
    fileContents[reviewSession.activeFileId] ?? activeFile?.content ?? ""

  const hasConflicts = sessionFiles.some((file) =>
    fileHasConflicts(file, file.content)
  )
  const firstConflictedFile = React.useMemo(
    () => getFirstConflictedFile(sessionFiles, fileContents),
    [fileContents, sessionFiles]
  )
  const parsedSegments = React.useMemo(
    () => parseEditorSegments(activeContent),
    [activeContent]
  )
  const hasInlineConflicts =
    activeFile !== undefined &&
    fileHasConflicts(activeFile, activeContent) &&
    parsedSegments.some((segment) => segment.type === "conflict")
  const effectiveMode = reviewSession.mode ?? null
  const conflictSignature = React.useMemo(
    () =>
      sessionFiles
        .filter((file) => fileHasConflicts(file, file.content))
        .map((file) => file.filePath)
        .join("||"),
    [sessionFiles]
  )

  const conflictRefs = React.useRef<Map<string, HTMLElement>>(new Map())
  const [currentConflictIdx, setCurrentConflictIdx] = React.useState(0)

  const conflictSegments = React.useMemo(
    () => parsedSegments.filter((s) => s.type === "conflict"),
    [parsedSegments]
  )

  const handleJumpToNextConflict = React.useCallback(() => {
    if (conflictSegments.length === 0) return
    const idx = currentConflictIdx % conflictSegments.length
    const seg = conflictSegments[idx]
    const el = conflictRefs.current.get(seg.id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    setCurrentConflictIdx((prev) => (prev + 1) % conflictSegments.length)
  }, [conflictSegments, currentConflictIdx])

  const rebaseState = revision.rebaseState as RebaseState | null

  React.useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }

      if (finalizeProgressResetRef.current !== null) {
        window.clearTimeout(finalizeProgressResetRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (!conflictSignature) {
      lastConflictSignatureRef.current = null
      return
    }

    if (!effectiveMode || !hasConflicts) {
      return
    }

    const requestedPath = conflictFocusPathRef.current
    const shouldFocus =
      Boolean(requestedPath) ||
      lastConflictSignatureRef.current !== conflictSignature

    if (!shouldFocus) {
      return
    }

    const targetFile =
      (requestedPath
        ? sessionFiles.find(
            (file) =>
              file.filePath === requestedPath &&
              fileHasConflicts(file, file.content)
          )
        : null) ?? firstConflictedFile

    if (!targetFile) {
      return
    }

    setReviewSession((prev) =>
      prev.activeFileId === targetFile.id
        ? prev
        : { ...prev, activeFileId: targetFile.id }
    )
    setActiveTab("3-way")
    conflictAutoScrollRef.current = true
    conflictFocusPathRef.current = null
    lastConflictSignatureRef.current = conflictSignature
  }, [
    conflictSignature,
    effectiveMode,
    firstConflictedFile,
    hasConflicts,
    sessionFiles,
  ])

  React.useEffect(() => {
    if (
      !conflictAutoScrollRef.current ||
      activeTab !== "3-way" ||
      !hasInlineConflicts
    ) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      firstConflictAnchorRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      })
      conflictAutoScrollRef.current = false
    })

    return () => window.cancelAnimationFrame(frame)
  }, [activeTab, activeFile?.id, hasInlineConflicts, parsedSegments])

  const visibleActiveTab =
    activeTab === "3-way" && !hasInlineConflicts ? "diff" : activeTab

  const updateFinalizeProgressState = React.useCallback(
    (nextState: Exclude<OperationProgressState, "idle">) => {
      if (finalizeProgressResetRef.current !== null) {
        window.clearTimeout(finalizeProgressResetRef.current)
        finalizeProgressResetRef.current = null
      }

      setFinalizeProgressState(nextState)

      if (nextState === "running") {
        return
      }

      finalizeProgressResetRef.current = window.setTimeout(
        () => {
          setFinalizeProgressState("idle")
        },
        nextState === "success" ? 1400 : 3200
      )
    },
    []
  )

  React.useEffect(() => {
    if (
      effectiveMode !== "FINE_GRAINED" ||
      rebaseState?.status !== "IN_PROGRESS"
    ) {
      return
    }

    const interval = window.setInterval(() => router.refresh(), 2000)

    return () => window.clearInterval(interval)
  }, [effectiveMode, rebaseState?.status, router])

  const applyDraftSnapshot = React.useCallback(
    (snapshot: ReviewActionDraftSnapshot) => {
      setReviewSession((prev) => {
        const previousFiles = new Map(prev.files.map((file) => [file.id, file]))

        return {
          ...prev,
          files: snapshot.files.map((file) => {
            const previousFile = previousFiles.get(file.id)

            return {
              id: file.id,
              filePath: file.filePath,
              content: file.content,
              originalContent: previousFile?.originalContent ?? file.content,
              conflictContent: file.conflictContent ?? undefined,
              status: file.conflictContent ? "conflict" : "clean",
            }
          }),
          activeFileId: snapshot.activeFileId,
        }
      })

      setFileContents(
        Object.fromEntries(
          snapshot.files.map((file) => [
            file.id,
            file.conflictContent ?? file.content,
          ])
        )
      )
    },
    []
  )

  const handleSelectFile = (fileId: string) => {
    setReviewSession((prev) => ({ ...prev, activeFileId: fileId }))
  }

  const updateActiveFileContent = React.useCallback(
    (nextContent: string) => {
      setFileContents((prev) => ({
        ...prev,
        [reviewSession.activeFileId]: nextContent,
      }))
    },
    [reviewSession.activeFileId]
  )

  const persistSimpleResolution = React.useCallback(
    async (options?: { keepBranchSyncing?: boolean; silent?: boolean }) => {
      const collection = normalizeDraftFileCollection({
        activeFileId: activeFileIdRef.current,
        files: sessionFilesRef.current.map((file) => ({
          id: file.id,
          filePath: file.filePath,
          content: file.content,
        })),
      })

      const formData = new FormData()
      formData.set("draftFiles", serializeDraftFilesPayload(collection))

      if (!options?.keepBranchSyncing) {
        setIsBranchSyncing(true)
      }

      try {
        const result = await resolveConflictAction(pr.number, formData)

        if (result.draftSnapshot) {
          applyDraftSnapshot(result.draftSnapshot)
        }

        if (result.hasConflicts) {
          conflictFocusPathRef.current = result.focusFilePath ?? null

          if (!options?.silent) {
            setActionNotice({
              tone: "warning",
              message: result.focusFilePath
                ? `CONFLICT_REMAINS_[${result.focusFilePath}]`
                : "CONFLICT_REMAINS_",
            })
          }
        } else if (!options?.silent) {
          setActionNotice({
            tone: "success",
            message: "CONFLICTS_RESOLVED_AND_BRANCH_UPDATED_",
          })
        }

        pendingServerRefreshRef.current = true
        router.refresh()
      } catch (error) {
        if (!options?.silent) {
          throw error
        }

        if (isReauthRequiredError(error)) {
          window.location.href = getReauthLoginUrl(
            window.location.pathname + window.location.search
          )
          return
        }

        setActionError(error instanceof Error ? error.message : String(error))
      } finally {
        setIsBranchSyncing(false)
      }
    },
    [applyDraftSnapshot, pr.number, router]
  )

  const resolveConflictSegment = React.useCallback(
    (segmentId: string, resolution: string) => {
      updateActiveFileContent(
        serializeEditorSegments(
          parsedSegments.flatMap((segment) =>
            segment.type === "conflict" && segment.id === segmentId
              ? [
                  {
                    type: "text" as const,
                    id: `${segment.id}-resolved`,
                    content: resolution,
                  },
                ]
              : [segment]
          )
        )
      )

      if (effectiveMode === "SIMPLE") {
        if (autosaveTimeoutRef.current) {
          clearTimeout(autosaveTimeoutRef.current)
        }

        setActionError(null)
        setIsBranchSyncing(true)
        autosaveTimeoutRef.current = setTimeout(() => {
          autosaveTimeoutRef.current = null
          void persistSimpleResolution({
            keepBranchSyncing: true,
            silent: true,
          })
        }, 500)
      }
    },
    [
      effectiveMode,
      parsedSegments,
      persistSimpleResolution,
      updateActiveFileContent,
    ]
  )

  const insertSyntax = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return
    const view = textareaRef.current.view
    if (!view) return

    const selection = view.state.selection.main
    const selected = view.state.sliceDoc(selection.from, selection.to)
    const newText = prefix + selected + suffix

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: newText,
      },
      selection: {
        anchor: selection.from + prefix.length,
        head: selection.from + prefix.length + selected.length,
      },
    })

    view.focus()
  }

  const handleSelectMode = async (mode: ConflictMode) => {
    setActionError(null)
    setActionNotice(null)
    setIsSelectingMode(true)
    try {
      const result = await selectModeAction(revision.id, mode)
      const selectedMode = result.conflictMode ?? mode

      if (result.draftSnapshot) {
        applyDraftSnapshot(result.draftSnapshot)
      }

      if (result.hasConflicts) {
        conflictFocusPathRef.current = result.focusFilePath ?? null
        conflictAutoScrollRef.current = true
        setActionNotice({
          tone: "warning",
          message: result.focusFilePath
            ? `CONFLICT_DETECTED_[${selectedMode}]_[${result.focusFilePath}]`
            : `CONFLICT_DETECTED_[${selectedMode}]`,
        })
      } else {
        setActiveTab("write")
        setActionNotice({
          tone: "success",
          message:
            result.status === "NO_CHANGE"
              ? `NO_NEW_COMMITS_TO_REPLAY_[${selectedMode}]`
              : `NO_CONFLICTS_DETECTED_[${selectedMode}]`,
        })
      }

      setReviewSession((prev) => ({
        ...prev,
        mode: selectedMode,
        activeFileId: result.focusFilePath
          ? (prev.files.find((file) => file.filePath === result.focusFilePath)
              ?.id ?? prev.activeFileId)
          : prev.activeFileId,
      }))
      pendingServerRefreshRef.current = true
      router.refresh()
    } catch (error) {
      if (isReauthRequiredError(error)) {
        window.location.href = getReauthLoginUrl(
          window.location.pathname + window.location.search
        )
        return
      }

      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsSelectingMode(false)
    }
  }

  const handleAbort = async () => {
    setActionError(null)
    setActionNotice(null)
    setIsAborting(true)
    try {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
        autosaveTimeoutRef.current = null
      }

      setIsBranchSyncing(false)
      await abortResolutionAction(revision.id)
      abortedRef.current = true
      setReviewSession((prev) => ({ ...prev, mode: null }))
      pendingServerRefreshRef.current = true
      router.refresh()
    } catch (error) {
      if (isReauthRequiredError(error)) {
        window.location.href = getReauthLoginUrl(
          window.location.pathname + window.location.search
        )
        return
      }

      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsAborting(false)
    }
  }

  const handleFinalize = async (options?: {
    commitTitle?: string
    commitBody?: string
    mergeMethod?: ReviewMergeMethod
  }) => {
    setActionError(null)
    setActionNotice(null)
    setIsFinalizing(true)
    updateFinalizeProgressState("running")
    try {
      await finalizeReviewAction(pr.number, options)
      updateFinalizeProgressState("success")
      router.push("/review")
    } catch (error) {
      if (isReauthRequiredError(error)) {
        window.location.href = getReauthLoginUrl(
          window.location.pathname + window.location.search
        )
        return
      }

      updateFinalizeProgressState("error")
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsFinalizing(false)
    }
  }

  const simpleFileStatuses = sessionFiles.map((f) => ({
    filePath: f.filePath,
    status: f.status,
  }))
  const diffBaseContent = activeFile?.originalContent ?? ""

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <ReviewFileList
        files={sessionFiles}
        activeFileId={reviewSession.activeFileId}
        onSelectFile={handleSelectFile}
      />

      <div className="space-y-4">
        <div className="border-tech-main/40 bg-tech-bg/95 text-tech-main sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border px-4 py-3 font-mono text-xs backdrop-blur-sm">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <span className="border-tech-main/40 bg-tech-main/10 shrink-0 border px-2 py-0.5 tracking-widest uppercase">
              FILES_CHANGED_#{pr.number}
            </span>
            <span className="truncate tracking-widest uppercase">
              {pr.title}
            </span>
            {effectiveMode && (
              <span className="border-tech-main/30 bg-tech-main/5 text-tech-main/70 shrink-0 border px-2 py-0.5 tracking-widest uppercase">
                {effectiveMode}
              </span>
            )}
            <span className="guide-line text-tech-main/60 shrink-0 border bg-white/70 px-2 py-0.5 tracking-widest uppercase">
              {pr.baseRef} ← {pr.headRef}
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <span className="text-tech-main/60 font-mono text-[0.6875rem] tracking-widest uppercase">
              {pr.commits}_COMMITS
            </span>
            <span className="text-tech-main/60 font-mono text-[0.6875rem] tracking-widest uppercase">
              {pr.changedFiles}_FILES
            </span>
            <span className="font-mono text-[0.6875rem] tracking-widest text-green-700 uppercase">
              +{pr.additions}
            </span>
            <span className="font-mono text-[0.6875rem] tracking-widest text-red-600 uppercase">
              -{pr.deletions}
            </span>
            <a
              href={pr.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-tech-main-dark shrink-0 tracking-widest uppercase underline underline-offset-4">
              OPEN_PR_
            </a>
          </div>
        </div>
        <div className="bg-tech-main/20 h-px" />

        {effectiveMode === null && isMounted
          ? ReactDOM.createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="border-tech-main/40 relative w-full max-w-2xl border bg-white p-6 shadow-xl">
                  <CornerBrackets color="border-tech-main/40" />
                  <p className="text-tech-main/60 mb-4 font-mono text-xs tracking-widest uppercase">
                    RESOLUTION_METHOD_
                  </p>
                  <ModeSelector
                    modeAnalysis={reviewSession.modeAnalysis}
                    onSelectMode={handleSelectMode}
                    hasConflicts={hasConflicts}
                    isSelecting={isSelectingMode}
                  />
                </div>
              </div>,
              document.body
            )
          : null}

        {effectiveMode !== null ? (
          <>
            {actionError ? (
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="w-full border-l-4 border-red-500 bg-red-500/5 px-4 py-3 text-left font-mono text-xs text-red-700 transition hover:bg-red-500/10"
                aria-label="Dismiss action error">
                {actionError}
              </button>
            ) : null}

            {actionNotice ? (
              <button
                type="button"
                onClick={() => setActionNotice(null)}
                className={`w-full border-l-4 px-4 py-3 text-left font-mono text-xs transition ${
                  actionNotice.tone === "warning"
                    ? "border-amber-500 bg-amber-500/10 text-amber-800 hover:bg-amber-500/15"
                    : actionNotice.tone === "success"
                      ? "border-green-500 bg-green-500/10 text-green-800 hover:bg-green-500/15"
                      : "border-tech-main bg-tech-main/5 text-tech-main hover:bg-tech-main/10"
                }`}
                aria-label="Dismiss action notice">
                {actionNotice.message}
              </button>
            ) : null}

            <RebaseProgress
              mode={effectiveMode}
              rebaseState={rebaseState}
              files={simpleFileStatuses}
              isBranchSyncing={isBranchSyncing}
              onAbort={handleAbort}
              onFinalize={handleFinalize}
              isAborting={isAborting}
              isFinalizing={isFinalizing}
              finalizeProgressState={finalizeProgressState}
              defaultCommitTitle={squashCommitDefaults?.title}
              defaultCommitBody={squashCommitDefaults?.body}
              coauthorLines={squashCommitDefaults?.coauthorLines}
              mergeStrategyAnalysis={mergeStrategyAnalysis}
            />

            <div className="editor-grow border-tech-main/40 relative border bg-white/80 backdrop-blur-sm">
              <EditorTabStrip
                activeTab={visibleActiveTab}
                onTabChange={setActiveTab}
                threeWayId="review-editor-three-way-panel"
                writeId="review-editor-write-panel"
                diffId="review-editor-diff-panel"
                previewId="review-editor-preview-panel"
                showThreeWayTab={hasInlineConflicts}
                showDiffTab
                rightSlot={activeFile?.filePath || "UNTITLED_FILE_"}
              />

              {visibleActiveTab === "3-way" && hasInlineConflicts && (
                <div className="guide-line bg-tech-main/3 flex items-center border-b px-3 py-1">
                  <button
                    type="button"
                    onClick={handleJumpToNextConflict}
                    className="border-tech-main/30 text-tech-main/60 hover:border-tech-main hover:text-tech-main border px-2 py-1 font-mono text-[0.625rem] tracking-widest uppercase">
                    NEXT_CONFLICT_ ↓
                  </button>
                  <span className="text-tech-main/40 ml-2 font-mono text-[0.625rem] tracking-widest uppercase">
                    {conflictSegments.length} UNRESOLVED
                  </span>
                </div>
              )}

              {visibleActiveTab === "write" && !hasInlineConflicts && (
                <EditorToolbar
                  onInsert={insertSyntax}
                  lineWrap={lineWrap}
                  onWrapToggle={() => setLineWrap((v) => !v)}
                />
              )}

              <section
                id="review-editor-three-way-panel"
                role="tabpanel"
                className="editor-grow"
                hidden={visibleActiveTab !== "3-way"}>
                <div className="editor-surface">
                  {hasInlineConflicts ? (
                    <div className="custom-left-scrollbar overflow-auto">
                      <pre className="p-4 font-mono text-xs/relaxed whitespace-pre-wrap sm:p-6">
                        {parsedSegments.map((segment) => {
                          if (segment.type === "text") {
                            return (
                              <span
                                key={segment.id}
                                className="text-tech-main/80 block">
                                {segment.content || "\u00a0"}
                              </span>
                            )
                          }
                          return (
                            <span
                              key={segment.id}
                              ref={(el) => {
                                if (el) conflictRefs.current.set(segment.id, el)
                                else conflictRefs.current.delete(segment.id)
                              }}>
                              <span className="block border-l-2 border-red-500 bg-red-500/10 pl-2 font-bold text-red-700">
                                {"<<<<<<< draft"}
                              </span>
                              <span className="block pl-2 font-mono text-[0.6rem] text-red-600/70 select-none">
                                <button
                                  type="button"
                                  onClick={() =>
                                    resolveConflictSegment(
                                      segment.id,
                                      segment.ours
                                    )
                                  }
                                  className="cursor-pointer hover:text-red-700 hover:underline">
                                  [accept ours]
                                </button>
                                {" · "}
                                <button
                                  type="button"
                                  onClick={() =>
                                    resolveConflictSegment(
                                      segment.id,
                                      segment.theirs
                                    )
                                  }
                                  className="cursor-pointer hover:text-blue-700 hover:underline">
                                  [accept theirs]
                                </button>
                              </span>
                              {
                                segment.ours.split("\n").reduce<{
                                  nodes: React.ReactNode[]
                                  offset: number
                                }>(
                                  (acc, line) => {
                                    acc.nodes.push(
                                      <span
                                        key={`${segment.id}-o${acc.offset}`}
                                        className="block border-l-2 border-red-300 bg-red-500/5 pl-2 text-red-900">
                                        {line || "\u00a0"}
                                      </span>
                                    )
                                    acc.offset += line.length + 1
                                    return acc
                                  },
                                  { nodes: [], offset: 0 }
                                ).nodes
                              }
                              <span className="block border-l-2 border-gray-400 bg-gray-100 pl-2 text-gray-500">
                                {"======="}
                              </span>
                              {
                                segment.theirs.split("\n").reduce<{
                                  nodes: React.ReactNode[]
                                  offset: number
                                }>(
                                  (acc, line) => {
                                    acc.nodes.push(
                                      <span
                                        key={`${segment.id}-t${acc.offset}`}
                                        className="block border-l-2 border-blue-300 bg-blue-500/5 pl-2 text-blue-900">
                                        {line || "\u00a0"}
                                      </span>
                                    )
                                    acc.offset += line.length + 1
                                    return acc
                                  },
                                  { nodes: [], offset: 0 }
                                ).nodes
                              }
                              <span className="block border-l-2 border-blue-500 bg-blue-500/10 pl-2 font-bold text-blue-700">
                                {">>>>>>> main"}
                              </span>
                            </span>
                          )
                        })}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-3 p-6">
                      <p className="text-tech-main/60 font-mono text-xs tracking-widest uppercase">
                        NO_CONFLICTS_LEFT_
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section
                id="review-editor-write-panel"
                role="tabpanel"
                className="editor-grow"
                hidden={visibleActiveTab !== "write"}>
                <div className="editor-surface">
                  <EditorTextarea
                    ref={textareaRef}
                    value={activeContent}
                    onChange={updateActiveFileContent}
                    placeholder={t("reviewContentPlaceholder")}
                    lineWrap={lineWrap}
                    onWrapToggle={() => setLineWrap((v) => !v)}
                  />
                </div>
              </section>

              <section
                id="review-editor-diff-panel"
                role="tabpanel"
                hidden={visibleActiveTab !== "diff"}
                className="editor-grow">
                <ReviewDiffPanel
                  baseContent={diffBaseContent}
                  currentContent={activeContent}
                />
              </section>

              <section
                id="review-editor-preview-panel"
                role="tabpanel"
                hidden={visibleActiveTab !== "preview"}
                className="editor-grow">
                {hasInlineConflicts ? (
                  <div className="space-y-3 p-6">
                    <p className="font-mono text-xs tracking-widest text-red-600 uppercase">
                      CONFLICTS_UNRESOLVED_
                    </p>
                    <p className="mono-label">
                      Resolve all conflicts before previewing.
                    </p>
                  </div>
                ) : activeContent.trim() ? (
                  <div className="selection:bg-tech-main/20 w-full max-w-none overflow-hidden p-6 wrap-break-word selection:text-slate-900 sm:p-8">
                    <LazyMarkdownPreview
                      content={activeContent}
                      rawPath={activeFile?.filePath ?? ""}
                    />
                  </div>
                ) : (
                  <p className="editor-panel">NOTHING_TO_PREVIEW_</p>
                )}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
