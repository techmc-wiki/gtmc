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
  const [lineWrap, setLineWrap] = React.useState(false)

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
  const [mounted, setMounted] = React.useState(false)
  const abortedRef = React.useRef(false)
  const autosaveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const textareaRef = React.useRef<any>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

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
                showReviewTabs={true}
                rightSlot={activeFile?.filePath || "UNTITLED_FILE_"}
              />

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
                        {(() => {
                          type LineRegion = "normal" | "ours" | "theirs"
                          let region: LineRegion = "normal"
                          let charOffset = 0
                          return activeContent.split("\n").map((line) => {
                            const key = `co${charOffset}`
                            charOffset += line.length + 1
                            let cls = "text-tech-main/80"
                            if (/^<<<<<<< draft/.test(line)) {
                              region = "ours"
                              cls =
                                "border-l-2 border-red-500 pl-2 bg-red-500/10 text-red-700 font-bold"
                            } else if (/^=======/.test(line)) {
                              region = "theirs"
                              cls =
                                "border-l-2 border-gray-400 pl-2 bg-gray-100 text-gray-500"
                            } else if (/^>>>>>>> main/.test(line)) {
                              region = "normal"
                              cls =
                                "border-l-2 border-blue-500 pl-2 bg-blue-500/10 text-blue-700 font-bold"
                            } else if (region === "ours") {
                              cls =
                                "bg-red-500/5 text-red-900 pl-2 border-l-2 border-red-300"
                            } else if (region === "theirs") {
                              cls =
                                "bg-blue-500/5 text-blue-900 pl-2 border-l-2 border-blue-300"
                            }
                            return (
                              <span key={key} className={`block ${cls}`}>
                                {line || "\u00a0"}
                              </span>
                            )
                          })
                        })()}
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
                          ) : null
                        )
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
                <section role="tabpanel" className="editor-grow flex flex-col">
                  <div className="flex min-h-0 flex-[3] divide-x divide-tech-main/20 border-b border-tech-main/20">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="border-b border-tech-main/20 bg-tech-main/5 px-3 py-1.5 font-mono text-[0.625rem] tracking-widest text-tech-main/60 uppercase">
                        HEAD_
                      </div>
                      <div className="custom-left-scrollbar min-h-[16rem] flex-1 overflow-auto">
                        {hasInlineConflicts ? (
                          <div className="p-3 font-mono text-xs/relaxed">
                            {parsedSegments.map((segment) => {
                              if (segment.type === "text") {
                                return (
                                  <pre
                                    key={segment.id}
                                    className="whitespace-pre-wrap text-tech-main/70">
                                    {segment.content}
                                  </pre>
                                )
                              }
                              return (
                                <div
                                  key={segment.id}
                                  className="my-1 border border-red-300 bg-red-500/5">
                                  <div className="flex items-center justify-between border-b border-red-300 bg-red-500/10 px-2 py-1">
                                    <span className="font-mono text-[0.6rem] tracking-widest text-red-700 uppercase">
                                      OURS (draft)
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
                                      ACCEPT OURS ↓
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
                        DRAFT_
                      </div>
                      <div className="custom-left-scrollbar min-h-[16rem] flex-1 overflow-auto">
                        {hasInlineConflicts ? (
                          <div className="p-3 font-mono text-xs/relaxed">
                            {parsedSegments.map((segment) => {
                              if (segment.type === "text") {
                                return (
                                  <pre
                                    key={segment.id}
                                    className="whitespace-pre-wrap text-tech-main/70">
                                    {segment.content}
                                  </pre>
                                )
                              }
                              return (
                                <div
                                  key={segment.id}
                                  className="my-1 border border-blue-300 bg-blue-500/5">
                                  <div className="flex items-center justify-between border-b border-blue-300 bg-blue-500/10 px-2 py-1">
                                    <span className="font-mono text-[0.6rem] tracking-widest text-blue-700 uppercase">
                                      THEIRS (main)
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
                                      ACCEPT THEIRS ↓
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
