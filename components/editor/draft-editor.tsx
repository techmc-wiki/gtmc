"use client"

import * as React from "react"
import { diffLines } from "diff"
import { useDraftEditor } from "@/components/editor/use-draft-editor"
import { DraftFileSourceDialog } from "@/components/editor/draft-file-source-dialog"
import { DraftEditorToolbar } from "@/components/editor/draft-editor-toolbar"
import { DraftFileNavigator } from "@/components/editor/draft-file-navigator"
import { DraftEditorHeader } from "@/components/editor/draft-editor-header"
import { DraftEditorReview } from "@/components/editor/draft-editor-review"
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
  EditorSurface,
  EditorContentArea,
  EditorWritePanel,
  EditorPreviewPanel,
  EditorPreviewFrame,
  EditorSplitLayout,
} from "@/components/editor/editor-frames"
import {
  ResizableHandle,
  ResizablePanel,
} from "@/components/ui/shadcn/resizable"
import { Tabs } from "@/components/ui/shadcn/tabs"
import type { TabType } from "@/components/editor/editor-tab-strip"

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
      actions.setActiveTab("write")
      actions.setFileDialogIntent(null)
      return true
    }
    const nextFile = createDraftFile({ content, filePath: normalizedPath })
    actions.updateDraftCollection((current) => ({
      activeFileId: nextFile.id,
      folders: current.folders || [],
      files: [...current.files, nextFile],
    }))
    actions.setActiveTab("write")
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
        if (!snapshot || snapshot.status === "loading") {
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
          return []
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
      toast.error("Invalid folder name", { duration: 2800 })
      return false
    }
    actions.updateDraftCollection((current) => ({
      ...current,
      folders: [...(current.folders || []), normalizedFolderPath],
    }))
    toast.success("Folder ready", { duration: 2000 })
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
  const { state, refs, upload, progress, t, progressT } = hook

  return (
    <EditorSurface>
      <DraftEditorHeader
        hasUnsavedChanges={state.hasUnsavedChanges}
        isReadOnly={state.isReadOnly}
        isSaving={state.isSaving}
        isSubmitting={state.isSubmitting}
        saveDisabled={state.saveDisabled}
        saveError={state.saveError}
        submitDisabled={state.submitDisabled}
        title={state.title}
        onSave={actions.saveDraft}
        onSubmit={actions.handleSubmitDraft}
        onTitleChange={actions.setTitle}
        submitLabel={state.isSubmitting ? progressT("submitBusy") : t("openPr")}
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
      <DraftFileNavigator
        files={state.draftCollection.files}
        activeFileId={state.draftCollection.activeFileId}
        activeFile={state.activeFile}
        unsavedFileIds={state.unsavedFileIds}
        onSelectFile={(fileId) =>
          actions.setDraftCollection((current) => ({
            ...current,
            activeFileId: fileId,
          }))
        }
        onRemoveFile={handleRemoveFile}
        isReadOnly={state.isReadOnly}
        activeFileHasDuplicatePath={state.activeFileHasDuplicatePath}
        duplicateFilePaths={state.duplicateFilePaths}
        onOpenFileDialog={actions.openFileDialog}
        onSetInsertDialogIntent={actions.setInsertDialogIntent}
      />
      <EditorContentArea>
        <Tabs
          value={state.activeTab}
          onValueChange={(value) => actions.setActiveTab(value as TabType)}
          className="flex min-h-0 grow flex-col">
          <DraftEditorToolbar
            activeTab={state.activeTab}
            activeFile={state.activeFile}
            activeFileIndex={state.activeFileIndex}
            lineWrap={state.lineWrap}
            onWrapToggle={() => actions.setLineWrap((value) => !value)}
            readOnly={state.isReadOnly}
            uploading={upload.isUploading}
            fileInputRef={refs.fileInputRef}
            onFileSelect={actions.handleUploadWithAutoSave}
            compressing={upload.isCompressing}
            onInsertSyntax={actions.insertSyntax}
            onInsertText={actions.insertTextAtCursor}
            onUndo={actions.handleUndoDraftEdit}
            onRedo={actions.handleRedoDraftEdit}
            canUndo={Boolean(state.activeFileHistoryAvailability?.undoCount)}
            canRedo={Boolean(state.activeFileHistoryAvailability?.redoCount)}
          />
          <EditorSplitLayout>
            <ResizablePanel
              id="write"
              defaultSize="50"
              minSize="25"
              className="flex">
              <EditorWritePanel value="write">
                <EditorTextareaDynamic
                  ref={refs.textareaRef}
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
              </EditorWritePanel>
            </ResizablePanel>
            <ResizableHandle className="bg-tech-main/20 hover:bg-tech-main/40 hidden w-px transition-colors md:flex" />
            <ResizablePanel
              id="preview"
              defaultSize="50"
              minSize="25"
              className="flex">
              <EditorPreviewPanel value="preview">
                <EditorPreviewFrame isEmpty={!state.activeFileContent.trim()}>
                  <LazyMarkdownPreview
                    content={state.activeFileContent}
                    rawPath={state.activeFile.filePath || ""}
                  />
                </EditorPreviewFrame>
              </EditorPreviewPanel>
            </ResizablePanel>
          </EditorSplitLayout>
        </Tabs>
      </EditorContentArea>
      <DraftEditorReview
        activeTab={state.activeInfoTab}
        changeEntries={changeEntries}
        contributingGuides={state.contributingGuides}
        folders={state.draftCollection.folders}
        selectedGuideId={state.activeGuideId}
        onSelectTab={actions.setActiveInfoTab}
        onSelectGuide={actions.setActiveGuideId}
      />
      {!state.isReadOnly && (
        <DraftEditorStatusPanels
          progress={progress}
          progressT={progressT}
          saveProgressState={state.saveProgressState}
          submitProgressState={state.submitProgressState}
          t={t}
        />
      )}
      <DraftFileSourceDialog
        key={
          state.fileDialogIntent
            ? `${state.fileDialogIntent.kind}:${state.fileDialogIntent.initialMode}:${getParentFolderPath(state.activeFile.filePath)}`
            : "closed:file-dialog"
        }
        isOpen={state.fileDialogIntent !== null}
        initialFolderPath={getParentFolderPath(state.activeFile.filePath)}
        initialMode={state.fileDialogIntent?.initialMode}
        onClose={() => actions.setFileDialogIntent(null)}
        onCreate={handleApplyDraftFileSource}
        onCreateFolder={handleCreateFolder}
      />
      <DraftFileSourceDialog
        key={
          state.insertDialogIntent
            ? `insert:${getParentFolderPath(state.activeFile.filePath)}`
            : "closed:insert-dialog"
        }
        isOpen={state.insertDialogIntent}
        initialFolderPath={getParentFolderPath(state.activeFile.filePath)}
        initialMode="repo"
        onClose={() => actions.setInsertDialogIntent(false)}
        onCreate={handleInsertSelectedFile}
      />
    </EditorSurface>
  )
}

function DraftEditorStatusPanels({
  progress,
  progressT,
  saveProgressState,
  submitProgressState,
  t,
}: {
  progress: ReturnType<typeof useDraftEditor>["progress"]
  progressT: ReturnType<typeof useDraftEditor>["progressT"]
  saveProgressState: ReturnType<
    typeof useDraftEditor
  >["state"]["saveProgressState"]
  submitProgressState: ReturnType<
    typeof useDraftEditor
  >["state"]["submitProgressState"]
  t: ReturnType<typeof useDraftEditor>["t"]
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
      <section
        aria-label={t("submissionLicenseAria")}
        className="guide-line bg-tech-main/5 text-tech-main/80 mt-4 border p-4 font-mono text-[0.6875rem] leading-relaxed">
        <div className="border-tech-main/15 mb-3 border-b pb-3">
          <p className="section-label">{t("syntaxHintsTitle")}</p>
          <p className="text-tech-main/70 mt-2">
            {t("syntaxHintsDescription")}
          </p>
          <p className="text-tech-main/55 mt-1">{t("syntaxHintsShortcut")}</p>
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
              className="decoration-tech-main/30 hover:text-tech-main-dark hover:decoration-tech-main-dark underline underline-offset-4 transition-colors">
              CC BY-NC-SA 4.0
            </a>
            {t("submissionLicenseReuseSuffix")}
          </p>
          <p>{t("submissionLicenseAttribution")}</p>
        </div>
      </section>
    </>
  )
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
      if (!part.added) oldLine += 1
      if (!part.removed) newLine += 1
    }
  }
  return rows
}
