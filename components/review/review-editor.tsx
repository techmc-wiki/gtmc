"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { EditorTabStrip } from "@/components/editor/editor-tab-strip"
import { EditorTextarea } from "@/components/editor/editor-textarea"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { LazyMarkdownPreview } from "@/components/editor/lazy-markdown-preview"
import { ConflictBlock } from "@/components/review/conflict-block"
import { ReviewFileList } from "@/components/review/review-file-list"
import { ModeSelector } from "@/components/review/mode-selector"
import { RebaseProgress } from "@/components/review/rebase-progress"
import {
  selectModeAction,
  abortResolutionAction,
  finalizeReviewAction,
} from "@/actions/review"
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
  const [reviewSession, setReviewSession] = React.useState<ReviewSessionState>(
    () => ({
      mode: inferMode(revision),
      files,
      activeFileId: files[0]?.id ?? "",
      modeAnalysis,
    })
  )

  const [activeTab, setActiveTab] = React.useState<"write" | "preview">("write")

  const [fileContents, setFileContents] = React.useState<
    Record<string, string>
  >(() => Object.fromEntries(files.map((f) => [f.id, f.content])))

  const [isSelectingMode, setIsSelectingMode] = React.useState(false)
  const [isAborting, setIsAborting] = React.useState(false)
  const [isFinalizing, setIsFinalizing] = React.useState(false)
  const abortedRef = React.useRef(false)

  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

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
  const effectiveMode = reviewSession.mode ?? (!hasConflicts ? "SIMPLE" : null)

  const rebaseState = revision.rebaseState as RebaseState | null

  React.useEffect(() => {
    if (reviewSession.mode !== null || hasConflicts || abortedRef.current) {
      return
    }

    let cancelled = false

    const persistSimpleMode = async () => {
      setIsSelectingMode(true)

      try {
        await selectModeAction(revision.id, "SIMPLE")

        if (!cancelled) {
          setReviewSession((prev) =>
            prev.mode === null ? { ...prev, mode: "SIMPLE" } : prev
          )
        }
      } finally {
        if (!cancelled) {
          setIsSelectingMode(false)
        }
      }
    }

    void persistSimpleMode()

    return () => {
      cancelled = true
    }
  }, [hasConflicts, reviewSession.mode, revision.id])

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
    },
    [parsedSegments, updateActiveFileContent]
  )

  const insertSyntax = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const selected = activeContent.substring(start, end)
    const newText = prefix + selected + suffix
    const next =
      activeContent.substring(0, start) + newText + activeContent.substring(end)

    setFileContents((prev) => ({
      ...prev,
      [reviewSession.activeFileId]: next,
    }))

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.selectionStart = start + prefix.length
        textareaRef.current.selectionEnd =
          start + prefix.length + selected.length
      }
    }, 0)
  }

  const handleSelectMode = async (mode: ConflictMode) => {
    setIsSelectingMode(true)
    try {
      await selectModeAction(revision.id, mode)
      setReviewSession((prev) => ({ ...prev, mode }))
    } finally {
      setIsSelectingMode(false)
    }
  }

  const handleAbort = async () => {
    setIsAborting(true)
    try {
      await abortResolutionAction(revision.id)
      abortedRef.current = true
      setReviewSession((prev) => ({ ...prev, mode: null }))
    } finally {
      setIsAborting(false)
    }
  }

  const handleFinalize = async (options?: {
    commitTitle?: string
    commitBody?: string
  }) => {
    setIsFinalizing(true)
    try {
      await finalizeReviewAction(pr.number, options)
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
        <div className="flex items-center justify-between gap-3 border border-tech-main/40 bg-tech-main/5 px-4 py-3 font-mono text-xs text-tech-main">
          <span className="truncate tracking-widest uppercase">
            PR_{pr.number}_ {pr.title}
          </span>
          <a
            href={pr.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 tracking-widest uppercase underline underline-offset-4 hover:text-tech-main-dark">
            OPEN_PR_
          </a>
        </div>

        {effectiveMode === null ? (
          <div className="border border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm">
            <ModeSelector
              modeAnalysis={reviewSession.modeAnalysis}
              onSelectMode={handleSelectMode}
              hasConflicts={hasConflicts}
              isSelecting={isSelectingMode}
            />
          </div>
        ) : (
          <>
            <RebaseProgress
              mode={effectiveMode}
              rebaseState={rebaseState}
              files={simpleFileStatuses}
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
                      {parsedSegments.map((segment) =>
                        segment.type === "conflict" ? (
                          <ConflictBlock
                            key={segment.id}
                            id={segment.id}
                            ours={segment.ours}
                            theirs={segment.theirs}
                            onAcceptOurs={() =>
                              resolveConflictSegment(segment.id, segment.ours)
                            }
                            onAcceptTheirs={() =>
                              resolveConflictSegment(segment.id, segment.theirs)
                            }
                            onManualEdit={(content) =>
                              resolveConflictSegment(segment.id, content)
                            }
                          />
                        ) : (
                          <textarea
                            key={segment.id}
                            value={segment.content}
                            onChange={(e) =>
                              updateTextSegment(segment.id, e.target.value)
                            }
                            className="min-h-30 w-full resize-y border guide-line bg-white px-4 py-3 font-mono text-sm/relaxed text-black outline-none focus:border-tech-main"
                            placeholder={t("unchangedContentPlaceholder")}
                          />
                        )
                      )}
                    </div>
                  ) : (
                    <EditorTextarea
                      ref={textareaRef}
                      value={activeContent}
                      onChange={handleContentChange}
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
        )}
      </div>
    </div>
  )
}
