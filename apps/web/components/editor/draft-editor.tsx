"use client"

import * as React from "react"
import { diffLines } from "diff"
import { useDraftEditor } from "@/components/editor/use-draft-editor"
import { DraftEditorToolbar } from "@/components/editor/draft-editor-toolbar"
import { DraftFileNavigator } from "@/components/editor/draft-file-navigator"
import { DraftEditorModeBar } from "@/components/editor/draft-editor-mode-bar"
import { DraftEditorHeader } from "@/components/editor/draft-editor-header"
import { DraftEditorInspector } from "@/components/editor/draft-editor-inspector"
import { DraftFileDialogs } from "@/components/editor/draft-file-dialogs"
import type {
  DraftChangeEntry,
  DraftDiffRow,
} from "@/components/editor/draft-editor-review"
import { toast } from "sonner"
import { LazyMarkdownPreview } from "@/components/editor/lazy-markdown-preview"
import { EditorTextareaDynamic } from "@/components/editor/editor-textarea-dynamic"
import {
  createDraftFile,
  normalizeDraftFilePath,
  normalizeDraftFolderPath,
  type DraftFileCollection,
} from "@/lib/drafts/files"
import { OperationProgress } from "@/components/ui/operation-progress"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/shadcn/resizable"
import { Tabs, TabsContent } from "@/components/ui/shadcn/tabs"
import { BookOpenIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { IconButton } from "@/components/ui/icon-button"
import styles from "@/components/editor/draft-editor.module.css"

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

export function DraftEditor({ initialData }: DraftEditorProps) {
  const hook = useDraftEditor(initialData)
  const { state, actions, t } = hook

  const handleRemoveFile = (fileId: string) => {
    if (state.isReadOnly || state.draftCollection.files.length <= 1) return
    actions.updateDraftCollection((current) => {
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
    const hasDuplicate = state.draftCollection.files.some(
      (file) =>
        normalizeDraftFilePath(file.filePath) === normalizedPath &&
        (state.fileDialogIntent?.kind !== "replace" ||
          file.id !== state.activeFile.id)
    )
    if (hasDuplicate) {
      toast.error(t("badgeFileAlreadyExists"), { duration: 3000 })
      return false
    }
    if (state.fileDialogIntent?.kind === "replace") {
      actions.updateDraftCollection((current) => ({
        ...current,
        files: current.files.map((file) =>
          file.id === current.activeFileId
            ? { ...file, content, filePath: normalizedPath }
            : file
        ),
      }))
      actions.setFileDialogIntent(null)
      return true
    }
    const nextFile = createDraftFile({ content, filePath: normalizedPath })
    actions.updateDraftCollection((current) => ({
      activeFileId: nextFile.id,
      folders: current.folders || [],
      files: [...current.files, nextFile],
    }))
    actions.setFileDialogIntent(null)
    return true
  }

  const changeEntries = React.useMemo<DraftChangeEntry[]>(
    () =>
      state.draftCollection.files.flatMap((file): DraftChangeEntry[] => {
        const normalizedPath = normalizeDraftFilePath(file.filePath)
        const snapshot = state.repoSnapshots[file.id]
        if (!normalizedPath) {
          return [
            {
              changeType: "pending",
              file,
              rows: buildDiffRows("", file.content),
            },
          ]
        }
        if (
          !snapshot ||
          snapshot.filePath !== normalizedPath ||
          snapshot.status === "loading"
        ) {
          return [
            {
              changeType: "pending",
              file,
              rows: buildDiffRows("", file.content),
            },
          ]
        }
        if (snapshot.status === "missing") {
          return [
            {
              changeType: "new",
              file,
              rows: buildDiffRows("", file.content),
            },
          ]
        }
        if (snapshot.status === "error" || snapshot.content === null) {
          return [{ changeType: "error", file, rows: [] }]
        }
        if (snapshot.content === file.content) {
          return []
        }
        return [
          {
            changeType: "modified",
            file,
            rows: buildDiffRows(snapshot.content, file.content),
          },
        ]
      }),
    [state.draftCollection.files, state.repoSnapshots]
  )

  const handleInsertSelectedFile = ({
    filePath,
  }: {
    content: string
    filePath: string
  }) => {
    const normalizedTargetPath = normalizeDraftFilePath(filePath)
    if (!normalizedTargetPath) return false
    const linkLabel = normalizedTargetPath
      .split("/")
      .filter(Boolean)
      .slice(-1)[0]
      ?.replace(/\.md$/i, "")
    actions.insertTextAtCursor(
      `[${linkLabel || "linked-file"}](${normalizedTargetPath})`
    )
    actions.setInsertDialogIntent(false)
    return true
  }

  const handleCreateFolder = (folderPath: string) => {
    const normalizedFolderPath = normalizeDraftFolderPath(folderPath)
    if (!normalizedFolderPath) {
      toast.error(t("invalidFolder"), { duration: 2800 })
      return false
    }
    actions.updateDraftCollection((current) => ({
      ...current,
      folders: [...(current.folders || []), normalizedFolderPath],
    }))
    toast.success(t("folderReady"), { duration: 2000 })
    actions.setFileDialogIntent(null)
    return true
  }

  return (
    <DraftEditorSurface
      actions={actions}
      changeEntries={changeEntries}
      handleApplyDraftFileSource={handleApplyDraftFileSource}
      handleCreateFolder={handleCreateFolder}
      handleInsertSelectedFile={handleInsertSelectedFile}
      handleRemoveFile={handleRemoveFile}
      hook={hook}
    />
  )
}

interface EditorPreviewFrameProps {
  children: React.ReactNode
  className?: string
  emptyState?: React.ReactNode
  isEmpty?: boolean
}

function EditorPreviewFrame({
  children,
  className = "",
  emptyState,
  isEmpty = false,
}: EditorPreviewFrameProps) {
  if (isEmpty) {
    return (
      <p className="text-tech-main/60 p-6 text-sm sm:p-8">
        {emptyState || "Nothing to preview yet."}
      </p>
    )
  }

  return (
    <div
      className={`selection:bg-tech-main/20 selection:text-tech-main-dark w-full max-w-none overflow-hidden p-6 wrap-break-word sm:p-8 ${className}`}>
      {children}
    </div>
  )
}

interface DraftEditorSurfaceProps {
  actions: ReturnType<typeof useDraftEditor>["actions"]
  changeEntries: DraftChangeEntry[]
  handleApplyDraftFileSource: (input: {
    content: string
    filePath: string
  }) => boolean
  handleCreateFolder: (folderPath: string) => boolean
  handleInsertSelectedFile: (input: {
    content: string
    filePath: string
  }) => boolean
  handleRemoveFile: (fileId: string) => void
  hook: ReturnType<typeof useDraftEditor>
}

function DraftEditorSurface({
  actions,
  changeEntries,
  handleApplyDraftFileSource,
  handleCreateFolder,
  handleInsertSelectedFile,
  handleRemoveFile,
  hook,
}: DraftEditorSurfaceProps) {
  const {
    state,
    refs: { fileInputRef, textareaRef },
    upload,
    progress,
    t,
    progressT,
  } = hook

  const [mode, setMode] = React.useState<"write" | "split" | "preview">("write")
  const [inspectorOpen, setInspectorOpen] = React.useState(false)
  React.useEffect(() => {
    const viewport = window.matchMedia("(min-width: 48rem)")
    const adaptMode = () => {
      if (!viewport.matches) {
        setMode((current) => (current === "split" ? "write" : current))
      }
    }
    adaptMode()
    viewport.addEventListener("change", adaptMode)
    return () => viewport.removeEventListener("change", adaptMode)
  }, [])
  const openInspector = (tab: "changes" | "guide") => {
    actions.setActiveInfoTab(tab)
    setInspectorOpen(true)
  }

  return (
    <div className="border-tech-main/25 bg-surface w-full min-w-0 border">
      <DraftEditorHeader
        onOpenGuide={() => openInspector("guide")}
        isReadOnly={state.isReadOnly}
        onTitleChange={actions.setTitle}
        save={{
          busy: state.isSaving,
          disabled: state.saveDisabled,
          onClick: actions.saveDraft,
        }}
        status={
          state.saveError
            ? { kind: "error", message: state.saveError }
            : state.isSaving
              ? { kind: "saving" }
              : state.hasUnsavedChanges
                ? { kind: "unsaved" }
                : { kind: "saved" }
        }
        submit={{
          busy: state.isSubmitting,
          disabled: state.isSubmitting,
          onClick: () => openInspector("changes"),
        }}
        title={state.title}
      />
      {state.githubPrUrl ? (
        <div className="guide-line bg-tech-main/5 text-tech-main flex items-center justify-between gap-3 border px-4 py-3 font-mono text-xs">
          <span>{t("prStreamActive")}</span>
          <a
            href={state.githubPrUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4">
            {t("openGithubPr")}
          </a>
        </div>
      ) : null}
      <Tabs
        value={mode}
        onValueChange={(value) => {
          if (value === "write" || value === "split" || value === "preview") {
            setMode(value)
          }
        }}
        className="min-w-0">
        <DraftFileNavigator
          headerActions={
            <DraftEditorModeBar
              onOpenChanges={() => openInspector("changes")}
            />
          }
          onRenameFile={(path) => {
            const normalized = normalizeDraftFilePath(path)
            if (!normalized) return false
            if (
              state.draftCollection.files.some(
                (file) =>
                  file.id !== state.activeFile.id &&
                  normalizeDraftFilePath(file.filePath) === normalized
              )
            ) {
              toast.error(t("badgeFileAlreadyExists"))
              return false
            }
            actions.updateActiveFile({ filePath: normalized })
            return true
          }}
          files={state.draftCollection.files}
          activeFileId={state.draftCollection.activeFileId}
          activeFile={state.activeFile}
          unsavedFileIds={state.unsavedFileIds}
          onSelectFile={(fileId) => {
            actions.setDraftCollection((current) => ({
              ...current,
              activeFileId: fileId,
            }))
            setMode("write")
          }}
          onRemoveFile={handleRemoveFile}
          isReadOnly={state.isReadOnly}
          activeFileHasDuplicatePath={state.activeFileHasDuplicatePath}
          duplicateFilePaths={state.duplicateFilePaths}
          onOpenFileDialog={actions.openFileDialog}
          onSetInsertDialogIntent={(open) => {
            if (open) setMode("write")
            actions.setInsertDialogIntent(open)
          }}>
          <div className="flex min-w-0 flex-col">
            <TabsContent value={mode} className="min-w-0">
              {mode !== "preview" && (
                <DraftEditorToolbar
                  lineWrap={state.lineWrap}
                  onWrapToggle={() => actions.setLineWrap((value) => !value)}
                  readOnly={state.isReadOnly}
                  uploading={upload.isUploading}
                  fileInputRef={fileInputRef}
                  onFileSelect={actions.handleUploadWithAutoSave}
                  compressing={upload.isCompressing}
                  onInsertSyntax={actions.insertSyntax}
                  onInsertText={actions.insertTextAtCursor}
                  onUndo={actions.handleUndoDraftEdit}
                  onRedo={actions.handleRedoDraftEdit}
                  canUndo={Boolean(
                    state.activeFileHistoryAvailability?.undoCount
                  )}
                  canRedo={Boolean(
                    state.activeFileHistoryAvailability?.redoCount
                  )}
                />
              )}
              <ResizablePanelGroup
                orientation="horizontal"
                data-mode={mode}
                className={cn(styles.workspace, "min-w-0")}>
                <ResizablePanel
                  id="write"
                  defaultSize="50%"
                  minSize="25%"
                  className="h-full min-w-0">
                  <section
                    aria-label={t("writeTab")}
                    className="h-full w-full min-w-0 overflow-auto [&_.cm-editor]:min-h-full [&_.cm-editor]:bg-transparent! [&_.cm-scroller]:overflow-auto [&>div]:h-full">
                    <EditorTextareaDynamic
                      key={state.activeFile.id}
                      ref={textareaRef}
                      value={state.activeFileContent}
                      onChange={(value) =>
                        actions.updateActiveFile({ content: value })
                      }
                      onUndo={actions.handleUndoDraftEdit}
                      onRedo={actions.handleRedoDraftEdit}
                      onPaste={actions.handlePaste}
                      onDrop={actions.handleDrop}
                      onDragOver={(event) => {
                        if (!state.isReadOnly) event.preventDefault()
                      }}
                      onDragEnter={(event) => {
                        if (!state.isReadOnly) event.preventDefault()
                      }}
                      readOnly={state.isReadOnly}
                      saving={state.isSaving}
                      placeholder={t("contentPlaceholder")}
                      lineWrap={state.lineWrap}
                      canUndo={Boolean(
                        state.activeFileHistoryAvailability?.undoCount
                      )}
                      canRedo={Boolean(
                        state.activeFileHistoryAvailability?.redoCount
                      )}
                      enableSyntaxHints
                    />
                  </section>
                </ResizablePanel>
                <ResizableHandle
                  withHandle
                  className={cn(
                    "bg-tech-main/20 hidden w-px",
                    mode === "split" && "md:flex"
                  )}
                />
                <ResizablePanel
                  id="preview"
                  defaultSize="50%"
                  minSize="25%"
                  className="h-full min-w-0">
                  <section
                    aria-label={t("previewTab")}
                    className="bg-tech-bg/30 h-full overflow-y-auto">
                    <EditorPreviewFrame
                      isEmpty={!state.activeFileContent.trim()}
                      emptyState={t("previewEmpty")}
                      className="mx-auto max-w-3xl">
                      <LazyMarkdownPreview
                        content={state.activeFileContent}
                        rawPath={state.activeFile.filePath || ""}
                      />
                    </EditorPreviewFrame>
                  </section>
                </ResizablePanel>
              </ResizablePanelGroup>
            </TabsContent>
            <div className="border-tech-main/20 text-tech-main flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs">
              <span>
                {t("characterCount", {
                  count: [...state.activeFileContent].length,
                })}
                ,{" "}
                {t("lineCount", {
                  count: state.activeFileContent.split("\n").length,
                })}
              </span>
              <IconButton
                label={t("syntaxHintsTitle")}
                onClick={() => openInspector("guide")}>
                <BookOpenIcon aria-hidden />
              </IconButton>
            </div>
          </div>
        </DraftFileNavigator>
      </Tabs>
      <DraftEditorInspector
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
        activeTab={state.activeInfoTab}
        onSelectTab={actions.setActiveInfoTab}
        changeEntries={changeEntries}
        contributingGuides={state.contributingGuides}
        folders={state.draftCollection.folders}
        selectedGuideId={state.activeGuideId}
        onSelectGuide={actions.setActiveGuideId}
        isReadOnly={state.isReadOnly}
        title={state.title}
        hasMissingFilePath={state.hasMissingFilePath}
        duplicateFilePaths={state.duplicateFilePaths}
        isSubmitting={state.isSubmitting}
        submitDisabled={state.submitDisabled}
        onSubmit={actions.handleSubmitDraft}
      />
      {!state.isReadOnly && (
        <div className="px-4">
          <DraftEditorStatusPanels
            progress={progress}
            progressT={progressT}
            saveProgressState={state.saveProgressState}
            submitProgressState={state.submitProgressState}
          />
        </div>
      )}
      <DraftFileDialogs
        activeFilePath={state.activeFile.filePath}
        fileDialogIntent={state.fileDialogIntent}
        insertDialogOpen={state.insertDialogIntent}
        onCloseFileDialog={() => actions.setFileDialogIntent(null)}
        onCloseInsertDialog={() => actions.setInsertDialogIntent(false)}
        onCreateFile={(input) => {
          const applied = handleApplyDraftFileSource(input)
          if (applied) setMode("write")
          return applied
        }}
        onCreateFolder={handleCreateFolder}
        onInsertFile={handleInsertSelectedFile}
      />
    </div>
  )
}

function DraftEditorStatusPanels({
  progress,
  progressT,
  saveProgressState,
  submitProgressState,
}: {
  progress: ReturnType<typeof useDraftEditor>["progress"]
  progressT: ReturnType<typeof useDraftEditor>["progressT"]
  saveProgressState: ReturnType<
    typeof useDraftEditor
  >["state"]["saveProgressState"]
  submitProgressState: ReturnType<
    typeof useDraftEditor
  >["state"]["submitProgressState"]
}) {
  return (
    <>
      <OperationProgress
        state={saveProgressState}
        title={progressT("saveDraftTitle")}
        stages={progress.saveProgressStages}
        successLabel={progressT("saveDraftSuccess")}
        errorLabel={progressT("saveDraftError")}
      />
      <OperationProgress
        state={submitProgressState}
        title={progressT("submitTitle")}
        stages={progress.submitProgressStages}
        successLabel={progressT("submitSuccess")}
        errorLabel={progressT("submitError")}
      />
    </>
  )
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
        value: String(values.length - 4),
        skippedLines: values.length - 4,
      })
      oldLine += values.length - 4
      newLine += values.length - 4
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
      if (!part.added) oldLine += 1
      if (!part.removed) newLine += 1
    }
  }
  return rows
}
