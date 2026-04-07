"use client"

import * as React from "react"
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
  /<<<<<<< draft\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> main\n/g

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
      activeFileId: files[0]?.id ?? "",
      modeAnalysis,
    })
  )

  const [activeTab, setActiveTab] = React.useState<TabType>("write")

  const [fileContents, setFileContents] = React.useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(files.map((f) => [f.id, f.conflictContent ?? f.content]))
  )

  const [isSelectingMode, setIsSelectingMode] = React.useState(false)
  const [isAborting, setIsAborting] = React.useState(false)
  const [isFinalizing, setIsFinalizing] = React.useState(false)
  const [isBranchSyncing, setIsBranchSyncing] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const abortedRef = React.useRef(false)
  const autosaveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const textareaRef = React.useRef<any>(null)

  React.useEffect(() => {
    setReviewSession((prev) => ({ ...prev, files, modeAnalysis }))
  }, [files, modeAnalysis])

  React.useEffect(() => {
    setFileContents((prev) => {
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
  const parsedSegments = React.useMemo(
    () => parseEditorSegments(activeContent),
    [activeContent]
  )
  const hasInlineConflicts =
    activeFile !== undefined &&
    fileHasConflicts(activeFile, activeContent) &&
    parsedSegments.some((segment) => segment.type === "conflict")
  const effectiveMode = reviewSession.mode ?? null

  const rebaseState = revision.rebaseState as RebaseState | null

  React.useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [])

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
        await resolveConflictAction(pr.number, formData)
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
    setIsSelectingMode(true)
    try {
      await selectModeAction(revision.id, mode)
      setReviewSession((prev) => ({ ...prev, mode }))
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
    setIsFinalizing(true)
    try {
      await finalizeReviewAction(pr.number, options)
      router.push("/review")
    } catch (error) {
      if (isReauthRequiredError(error)) {
        window.location.href = getReauthLoginUrl(
          window.location.pathname + window.location.search
        )
        return
      }

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

        {effectiveMode === null && (
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
          </div>
        )}

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

            <RebaseProgress
              mode={effectiveMode}
              rebaseState={rebaseState}
              files={simpleFileStatuses}
              isBranchSyncing={isBranchSyncing}
              onAbort={handleAbort}
              onFinalize={handleFinalize}
              isAborting={isAborting}
              isFinalizing={isFinalizing}
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
                rightSlot={activeFile?.filePath || "UNTITLED_FILE_"}
              />

              {activeTab === "write" && !hasInlineConflicts && (
                <EditorToolbar onInsert={insertSyntax} />
              )}

              <section
                id="review-editor-write-panel"
                role="tabpanel"
                className="editor-grow"
                hidden={activeTab !== "write"}>
                <div className="editor-surface">
                  {hasInlineConflicts ? (
                    <div className="flex flex-col gap-4 p-4 sm:p-6">
                      {(() => {
                        const conflictSegments = parsedSegments.filter(
                          (s) => s.type === "conflict"
                        )
                        const conflictTotal = conflictSegments.length
                        let conflictIdx = 0
                        return parsedSegments.map((segment) =>
                          segment.type === "conflict" ? (
                            <ConflictBlock
                              key={`${activeFile?.id ?? ""}:${segment.id}`}
                              id={segment.id}
                              index={++conflictIdx}
                              total={conflictTotal}
                              ours={segment.ours}
                              theirs={segment.theirs}
                              onAcceptOurs={() =>
                                resolveConflictSegment(segment.id, segment.ours)
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
                                const resolution = rerereResolutionMap.get(key)
                                return resolution
                                  ? { resolution, source: "rerere" as const }
                                  : undefined
                              })()}
                            />
                          ) : (
                            <textarea
                              key={`${activeFile?.id ?? ""}:${segment.id}`}
                              value={segment.content}
                              onChange={(e) =>
                                updateTextSegment(segment.id, e.target.value)
                              }
                              className="min-h-30 w-full resize-y border guide-line bg-white px-4 py-3 font-mono text-sm/relaxed text-black outline-none focus:border-tech-main"
                              placeholder={t("unchangedContentPlaceholder")}
                            />
                          )
                        )
                      })()}
                    </div>
                  ) : (
                    <EditorTextarea
                      ref={textareaRef}
                      value={activeContent}
                      onChange={updateActiveFileContent}
                      placeholder={t("reviewContentPlaceholder")}
                    />
                  )}
                </div>
              </section>

              <section
                id="review-editor-preview-panel"
                role="tabpanel"
                hidden={activeTab !== "preview"}
                className="editor-grow">
                {activeContent.trim() ? (
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
