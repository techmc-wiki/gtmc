"use client"

import * as React from "react"
import ReactDOM from "react-dom"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import {
  EditorTabStrip,
  type TabType,
} from "@/components/editor/editor-tab-strip"
import { EditorTextarea } from "@/components/editor/editor-textarea"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { LazyMarkdownPreview } from "@/components/editor/lazy-markdown-preview"
import { ConflictBlock } from "@/components/review/conflict-block"
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
  ReviewFile,
  ReviewSessionState,
} from "@/types/review"
import type { RebaseState } from "@/types/rebase"

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

function summarizeTextSegment(content: string) {
  const lineCount = content.length === 0 ? 0 : content.split("\n").length
  const preview = content.replace(/\s+/g, " ").trim().slice(0, 72)

  return {
    lineCount,
    preview,
  }
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
  pr: { number: number; title: string; htmlUrl: string }
  files: ReviewFile[]
  initialActiveFileId?: string
  modeAnalysis: ModeAnalysis
  revision: { id: string; conflictMode: string | null; rebaseState: unknown }
  squashCommitDefaults?: {
    title: string
    body: string
    coauthorLines: string[]
  }
}

export function ReviewEditor({
  pr,
  files,
  initialActiveFileId,
  modeAnalysis,
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
    files.some((file) => Boolean(file.conflictContent)) ? "3-way" : "write"
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
  const [expandedThreeWaySegments, setExpandedThreeWaySegments] =
    React.useState<Record<string, boolean>>({})
  const [mounted, setMounted] = React.useState(false)
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

  const textareaRef = React.useRef<any>(null)
  React.useEffect(() => {
    setMounted(true)
  }, [])

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
  const firstConflictSegmentId = React.useMemo(
    () => parsedSegments.find((segment) => segment.type === "conflict")?.id ?? null,
    [parsedSegments]
  )
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
      Boolean(requestedPath) || lastConflictSignatureRef.current !== conflictSignature

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

  const rerereResolutionMap = React.useMemo(() => {
    const map = new Map<string, string>()
    if (rebaseState?.rerereApplied) {
      for (const block of rebaseState.rerereApplied) {
        const key = `${block.ours}|||${block.theirs}`
        if (block.autoApplied?.resolution) {
          map.set(key, block.autoApplied.resolution)
        }
      }
    }
    return map
  }, [rebaseState?.rerereApplied])

  const handleSelectFile = (fileId: string) => {
    setReviewSession((prev) => ({ ...prev, activeFileId: fileId }))
  }

  const toggleThreeWaySegment = React.useCallback(
    (segmentId: string) => {
      const fileId = reviewSession.activeFileId
      const key = `${fileId}:${segmentId}`

      setExpandedThreeWaySegments((prev) => ({
        ...prev,
        [key]: !prev[key],
      }))
    },
    [reviewSession.activeFileId]
  )

  const renderCollapsedThreeWaySegment = React.useCallback(
    (
      segment: Extract<EditorSegment, { type: "text" }>,
      tone: "neutral" | "draft" | "main"
    ) => {
      const key = `${reviewSession.activeFileId}:${segment.id}`
      const isExpanded = Boolean(expandedThreeWaySegments[key])
      const { lineCount, preview } = summarizeTextSegment(segment.content)
      const palette =
        tone === "draft"
          ? {
            border: "border-red-300/70",
            bg: "bg-red-500/[0.03]",
            text: "text-red-700/80",
            button:
              "border-red-300/80 text-red-700 hover:bg-red-500/10 hover:border-red-400",
          }
          : tone === "main"
            ? {
              border: "border-blue-300/70",
              bg: "bg-blue-500/[0.03]",
              text: "text-blue-700/80",
              button:
                "border-blue-300/80 text-blue-700 hover:bg-blue-500/10 hover:border-blue-400",
            }
            : {
              border: "border-tech-main/20",
              bg: "bg-tech-main/[0.03]",
              text: "text-tech-main/60",
              button:
                "border-tech-main/20 text-tech-main/70 hover:bg-tech-main/10 hover:border-tech-main/30",
            }

      return (
        <div
          key={segment.id}
          className={`my-1 border border-dashed ${palette.border} ${palette.bg}`}>
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <div className={`min-w-0 font-mono text-[0.625rem] tracking-widest uppercase ${palette.text}`}>
              <span>{lineCount}_UNCHANGED_LINES_</span>
              {preview ? (
                <span className="ml-2 truncate normal-case tracking-normal">
                  {preview}
                  {segment.content.length > preview.length ? "..." : ""}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => toggleThreeWaySegment(segment.id)}
              className={`min-h-[1.75rem] shrink-0 border px-2 py-0.5 font-mono text-[0.6rem] tracking-widest uppercase transition ${palette.button}`}>
              {isExpanded ? "COLLAPSE" : "EXPAND"}
            </button>
          </div>

          {isExpanded ? (
            <pre className={`border-t ${palette.border} px-3 py-2 font-mono text-xs/relaxed whitespace-pre-wrap ${palette.text}`}>
              {segment.content}
            </pre>
          ) : null}
        </div>
      )
    },
    [expandedThreeWaySegments, reviewSession.activeFileId, toggleThreeWaySegment]
  )

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFileContents((prev) => ({
      ...prev,
      [reviewSession.activeFileId]: e.target.value,
    }))
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

  const updateTextSegment = React.useCallback(
    (segmentId: string, nextText: string) => {
      updateActiveFileContent(
        serializeEditorSegments(
          parsedSegments.map((segment) =>
            segment.type === "text" && segment.id === segmentId
              ? { ...segment, content: nextText }
              : segment
          )
        )
      )
    },
    [parsedSegments, updateActiveFileContent]
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
    [pr.number, router]
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
        activeFileId:
          result.focusFilePath
            ? prev.files.find((file) => file.filePath === result.focusFilePath)
              ?.id ?? prev.activeFileId
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

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <ReviewFileList
        files={sessionFiles}
        activeFileId={reviewSession.activeFileId}
        onSelectFile={handleSelectFile}
      />

      <div className="space-y-4">
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border border-tech-main/40 bg-tech-bg/95 px-4 py-3 font-mono text-xs text-tech-main backdrop-blur-sm">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="shrink-0 border border-tech-main/40 bg-tech-main/10 px-2 py-0.5 tracking-widest uppercase">
              PR_{pr.number}_
            </span>
            <span className="truncate tracking-widest uppercase">
              {pr.title}
            </span>
            {effectiveMode && (
              <span className="shrink-0 border border-tech-main/30 bg-tech-main/5 px-2 py-0.5 tracking-widest text-tech-main/70 uppercase">
                {effectiveMode}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-[0.6875rem] tracking-widest text-tech-main/60 uppercase">
              {
                sessionFiles.filter(
                  (f) => f.status === "resolved" || f.status === "clean"
                ).length
              }
              /{sessionFiles.length}_FILES_
            </span>
            <a
              href={pr.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 tracking-widest uppercase underline underline-offset-4 hover:text-tech-main-dark">
              OPEN_PR_
            </a>
          </div>
        </div>
        <div className="h-px bg-tech-main/20" />

        {effectiveMode === null && mounted
          ? ReactDOM.createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="relative w-full max-w-2xl border border-tech-main/40 bg-white p-6 shadow-xl">
                <CornerBrackets color="border-tech-main/40" />
                <p className="mb-4 font-mono text-xs tracking-widest text-tech-main/60 uppercase">
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
                className={`w-full border-l-4 px-4 py-3 text-left font-mono text-xs transition ${actionNotice.tone === "warning"
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
            />

            <div
              className="
                relative editor-grow border
                border-tech-main/40 bg-white/80 backdrop-blur-sm
              ">
              <EditorTabStrip
                activeTab={activeTab}
                onTabChange={setActiveTab}
                writeId="review-editor-write-panel"
                previewId="review-editor-preview-panel"
                showReviewTabs={true}
                rightSlot={activeFile?.filePath || "UNTITLED_FILE_"}
              />

              {hasInlineConflicts && (
                <div className="flex items-center border-b border-tech-main/20 bg-tech-main/3 px-3 py-1">
                  <button
                    type="button"
                    onClick={handleJumpToNextConflict}
                    className="font-mono text-[0.625rem] tracking-widest uppercase px-2 py-1 border border-tech-main/30 text-tech-main/60 hover:border-tech-main hover:text-tech-main">
                    NEXT_CONFLICT_ ↓
                  </button>
                  <span className="ml-2 font-mono text-[0.625rem] tracking-widest text-tech-main/40 uppercase">
                    {conflictSegments.length} UNRESOLVED
                  </span>
                </div>
              )}

              {activeTab === "write" && !hasInlineConflicts && (
                <EditorToolbar
                  onInsert={insertSyntax}
                  lineWrap={lineWrap}
                  onWrapToggle={() => setLineWrap((v) => !v)}
                />
              )}

              <section
                id="review-editor-write-panel"
                role="tabpanel"
                className="editor-grow"
                hidden={activeTab !== "write"}>
                <div className="editor-surface">
                  {hasInlineConflicts ? (
                    <div className="custom-left-scrollbar overflow-auto">
                      <pre className="p-4 font-mono text-xs/relaxed whitespace-pre-wrap sm:p-6">
                        {parsedSegments.map((segment) => {
                          if (segment.type === "text") {
                            return (
                              <span
                                key={segment.id}
                                className="block text-tech-main/80">
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
                    <EditorTextarea
                      ref={textareaRef}
                      value={activeContent}
                      onChange={updateActiveFileContent}
                      placeholder={t("reviewContentPlaceholder")}
                      lineWrap={lineWrap}
                      onWrapToggle={() => setLineWrap((v) => !v)}
                    />
                  )}
                </div>
              </section>

              {activeTab === "diff" && (
                <section role="tabpanel" className="editor-grow">
                  {hasInlineConflicts ? (
                    <div className="custom-left-scrollbar flex flex-col gap-4 overflow-auto p-4 sm:p-6">
                      {(() => {
                        const conflictSegments = parsedSegments.filter(
                          (s) => s.type === "conflict"
                        )
                        const conflictTotal = conflictSegments.length
                        let conflictIdx = 0
                        return parsedSegments.map((segment, segIdx) => {
                          if (segment.type !== "conflict") return null
                          const localIdx = conflictIdx++

                          const prevSeg = parsedSegments[segIdx - 1]
                          const nextSeg = parsedSegments[segIdx + 1]
                          const contextBefore =
                            prevSeg?.type === "text"
                              ? prevSeg.content
                                .split("\n")
                                .filter((l) => l !== "")
                                .slice(-3)
                                .join("\n")
                              : undefined
                          const contextAfter =
                            nextSeg?.type === "text"
                              ? nextSeg.content
                                .split("\n")
                                .filter((l) => l !== "")
                                .slice(0, 3)
                                .join("\n")
                              : undefined

                          return (
                            <React.Fragment
                              key={`${activeFile?.id ?? ""}:${segment.id}`}>
                              {localIdx > 0 && (
                                <div className="h-px bg-tech-main/20 my-2" />
                              )}
                              {contextBefore && (
                                <pre className="border-l border-tech-main/20 bg-tech-main/3 px-3 py-1 font-mono text-[0.6875rem] text-tech-main/40 whitespace-pre-wrap">
                                  {contextBefore}
                                </pre>
                              )}
                              <ConflictBlock
                                id={segment.id}
                                index={localIdx + 1}
                                total={conflictTotal}
                                ours={segment.ours}
                                theirs={segment.theirs}
                                onAcceptOurs={() =>
                                  resolveConflictSegment(
                                    segment.id,
                                    segment.ours
                                  )
                                }
                                onAcceptTheirs={() =>
                                  resolveConflictSegment(
                                    segment.id,
                                    segment.theirs
                                  )
                                }
                                onManualEdit={(content) =>
                                  resolveConflictSegment(segment.id, content)
                                }
                                autoApplied={(() => {
                                  const key = `${segment.ours}|||${segment.theirs}`
                                  const resolution =
                                    rerereResolutionMap.get(key)
                                  return resolution
                                    ? {
                                      resolution,
                                      source: "rerere" as const,
                                    }
                                    : undefined
                                })()}
                              />
                              {contextAfter && (
                                <pre className="border-l border-tech-main/20 bg-tech-main/3 px-3 py-1 font-mono text-[0.6875rem] text-tech-main/40 whitespace-pre-wrap">
                                  {contextAfter}
                                </pre>
                              )}
                            </React.Fragment>
                          )
                        })
                      })()}
                    </div>
                  ) : (
                    <div className="custom-left-scrollbar overflow-auto">
                      <pre className="min-h-[24rem] p-6 font-mono text-xs text-tech-main/80 whitespace-pre-wrap">
                        {(() => {
                          const original = activeFile?.originalContent ?? ""
                          const current = activeContent
                          if (!original && !current)
                            return (
                              <span className="text-tech-main/30">
                                NOTHING_TO_DIFF_
                              </span>
                            )
                          const origLines = original.split("\n")
                          const currLines = current.split("\n")
                          const maxLen = Math.max(
                            origLines.length,
                            currLines.length
                          )
                          const result: React.ReactNode[] = []
                          let diffOffset = 0
                          for (let i = 0; i < maxLen; i++) {
                            const o = origLines[i]
                            const c = currLines[i]
                            if (o === undefined) {
                              result.push(
                                <span
                                  key={`d${diffOffset}a`}
                                  className="block border-l-2 border-green-500 bg-green-500/5 pl-2 text-green-800">
                                  + {c}
                                </span>
                              )
                              diffOffset += (c?.length ?? 0) + 1
                            } else if (c === undefined) {
                              result.push(
                                <span
                                  key={`d${diffOffset}r`}
                                  className="block border-l-2 border-red-500 bg-red-500/5 pl-2 text-red-800 line-through">
                                  - {o}
                                </span>
                              )
                              diffOffset += o.length + 1
                            } else if (o !== c) {
                              result.push(
                                <span
                                  key={`d${diffOffset}del`}
                                  className="block border-l-2 border-red-500 bg-red-500/5 pl-2 text-red-800 line-through">
                                  - {o}
                                </span>
                              )
                              result.push(
                                <span
                                  key={`d${diffOffset}add`}
                                  className="block border-l-2 border-green-500 bg-green-500/5 pl-2 text-green-800">
                                  + {c}
                                </span>
                              )
                              diffOffset += o.length + 1
                            } else {
                              result.push(
                                <span
                                  key={`d${diffOffset}eq`}
                                  className="block pl-2 text-tech-main/50">
                                  {"  "}
                                  {c}
                                </span>
                              )
                              diffOffset += c.length + 1
                            }
                          }
                          return result
                        })()}
                      </pre>
                    </div>
                  )}
                </section>
              )}

              {activeTab === "3-way" && (
                <section
                  role="tabpanel"
                  className="editor-grow flex flex-col min-h-0">
                  <div className="flex min-h-0 flex-[3] overflow-hidden divide-x divide-tech-main/20 border-b border-tech-main/20">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="border-b border-tech-main/20 bg-tech-main/5 px-3 py-1.5 font-mono text-[0.625rem] tracking-widest text-tech-main/60 uppercase">
                        CURRENT_(DRAFT)_
                      </div>
                      <div className="custom-left-scrollbar h-full overflow-y-auto">
                        {hasInlineConflicts ? (
                          <div className="p-3 font-mono text-xs/relaxed">
                            {parsedSegments.map((segment) => {
                              if (segment.type === "text") {
                                return renderCollapsedThreeWaySegment(
                                  segment,
                                  "draft"
                                )
                              }
                              return (
                                <div
                                  key={segment.id}
                                  ref={(el) => {
                                    if (el)
                                      conflictRefs.current.set(segment.id, el)
                                    else conflictRefs.current.delete(segment.id)
                                  }}
                                  className="my-1 border border-red-300 bg-red-500/5">
                                  <div className="flex items-center justify-between border-b border-red-300 bg-red-500/10 px-2 py-1">
                                    <span className="font-mono text-[0.6rem] tracking-widest text-red-700 uppercase">
                                      CURRENT (draft)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        resolveConflictSegment(
                                          segment.id,
                                          segment.ours
                                        )
                                      }
                                      className="min-h-[1.75rem] border border-red-400 bg-red-500/10 px-2 py-0.5 font-mono text-[0.6rem] tracking-widest text-red-700 uppercase hover:bg-red-500/20">
                                      ACCEPT CURRENT ↓
                                    </button>
                                  </div>
                                  <pre className="whitespace-pre-wrap p-2 text-red-900">
                                    {segment.ours}
                                  </pre>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <pre className="p-3 font-mono text-xs/relaxed whitespace-pre-wrap text-tech-main/70">
                            {activeFile?.originalContent ?? ""}
                          </pre>
                        )}
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="border-b border-tech-main/20 bg-tech-main/5 px-3 py-1.5 font-mono text-[0.625rem] tracking-widest text-tech-main/60 uppercase">
                        INCOMING_(MAIN)_
                      </div>
                      <div className="custom-left-scrollbar h-full overflow-y-auto">
                        {hasInlineConflicts ? (
                          <div className="p-3 font-mono text-xs/relaxed">
                            {parsedSegments.map((segment) => {
                              if (segment.type === "text") {
                                return renderCollapsedThreeWaySegment(
                                  segment,
                                  "main"
                                )
                              }
                              return (
                                <div
                                  key={segment.id}
                                  className="my-1 border border-blue-300 bg-blue-500/5">
                                  <div className="flex items-center justify-between border-b border-blue-300 bg-blue-500/10 px-2 py-1">
                                    <span className="font-mono text-[0.6rem] tracking-widest text-blue-700 uppercase">
                                      INCOMING (main)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        resolveConflictSegment(
                                          segment.id,
                                          segment.theirs
                                        )
                                      }
                                      className="min-h-[1.75rem] border border-blue-400 bg-blue-500/10 px-2 py-0.5 font-mono text-[0.6rem] tracking-widest text-blue-700 uppercase hover:bg-blue-500/20">
                                      ACCEPT INCOMING ↓
                                    </button>
                                  </div>
                                  <pre className="whitespace-pre-wrap p-2 text-blue-900">
                                    {segment.theirs}
                                  </pre>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <pre className="p-3 font-mono text-xs/relaxed whitespace-pre-wrap text-tech-main/70">
                            {activeFile?.content ?? ""}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-[2] flex-col">
                    <div className="border-b border-tech-main/20 bg-tech-main/5 px-3 py-1.5 font-mono text-[0.625rem] tracking-widest text-tech-main/60 uppercase">
                      RESULT_
                    </div>
                    <div className="custom-left-scrollbar min-h-[10rem] flex-1 overflow-auto">
                      <textarea
                        value={activeContent}
                        onChange={(e) =>
                          updateActiveFileContent(e.target.value)
                        }
                        className="h-full min-h-[10rem] w-full resize-none bg-transparent px-4 py-3 font-mono text-xs text-tech-main outline-none focus:bg-tech-main/5"
                      />
                    </div>
                  </div>
                </section>
              )}

              <section
                id="review-editor-preview-panel"
                role="tabpanel"
                hidden={activeTab !== "preview"}
                className="editor-grow">
                {hasInlineConflicts ? (
                  <div className="p-6 space-y-3">
                    <p className="font-mono text-xs tracking-widest text-red-600 uppercase">
                      CONFLICTS_UNRESOLVED_
                    </p>
                    <p className="font-mono text-xs text-tech-main/50">
                      Resolve all conflicts before previewing.
                    </p>
                  </div>
                ) : activeContent.trim() ? (
                  <div
                    className="
                      w-full max-w-none overflow-hidden p-6 wrap-break-word
                      selection:bg-tech-main/20 selection:text-slate-900
                      sm:p-8
                    ">
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
