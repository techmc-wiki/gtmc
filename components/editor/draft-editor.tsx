"use client"

import * as React from "react"
import { diffLines } from "diff"
import { useDraftEditor } from "@/components/editor/use-draft-editor"
import { DraftFileSourceDialog } from "@/components/editor/draft-file-source-dialog"
import { DraftEditorToolbar } from "@/components/editor/draft-editor-toolbar"
import { DraftEditorFiles } from "@/components/editor/draft-editor-files"
import { EditorBadge } from "@/components/editor/editor-badge"
import { LazyMarkdownPreview } from "@/components/editor/lazy-markdown-preview"
import { EditorTextarea } from "@/components/editor/editor-textarea"
import {
  createDraftFile,
  normalizeDraftFilePath,
  normalizeDraftFolderPath,
  type DraftFileCollection,
} from "@/lib/drafts/files"
import { OperationProgress } from "@/components/ui/operation-progress"
import { TechButton } from "../ui/tech-button"
import { InputBox } from "../ui/input-box"
import {
  EditorSurface,
  EditorActions,
} from "@/components/editor/editor-surface"
import {
  EditorContentArea,
  EditorWritePanel,
  EditorPreviewPanel,
  EditorPreviewFrame,
} from "@/components/editor/editor-preview-frame"

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

interface DraftDiffRow {
  newLine: number | null
  oldLine: number | null
  type: "add" | "context" | "remove" | "skipped"
  value: string
}

interface RepoFileSnapshot {
  content: string | null
  filePath: string
  status: "error" | "loaded" | "loading" | "missing"
}

export function DraftEditor({ initialData }: DraftEditorProps) {
  const hook = useDraftEditor(initialData)
  const { state, refs, actions, upload, badge, progress, t, progressT } = hook

  const handleAddFile = () => {
    actions.openFileDialog("add", "repo")
  }

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
      badge.showBadge(t("badgeFileAlreadyExists"), "error", 3000)
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

  const changeEntries = React.useMemo(
    () =>
      state.draftCollection.files
        .map((file) => {
          const normalizedPath = normalizeDraftFilePath(file.filePath)
          const snapshot = state.repoSnapshots[file.id]
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
    [state.draftCollection.files, state.repoSnapshots]
  )

  const newFolderPaths = React.useMemo(
    () => state.draftCollection.folders || [],
    [state.draftCollection.folders]
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
      badge.showBadge("INVALID_FOLDER_NAME_", "error", 2800)
      return false
    }
    actions.updateDraftCollection((current) => ({
      ...current,
      folders: [...(current.folders || []), normalizedFolderPath],
    }))
    badge.showBadge("FOLDER_READY_", "info", 2000)
    actions.setFileDialogIntent(null)
    return true
  }

  return (
    <EditorSurface variant="grid" as="form" onSubmit={actions.handleSaveDraft}>
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="draft-title"
              className="text-tech-main flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase">
              <span className="bg-tech-main/40 inline-block size-2" />
              {t("titleLabel")}
            </label>
          </div>
          <InputBox
            id="draft-title"
            required
            placeholder={t("titlePlaceholder")}
            className={`border-tech-main/40 focus:border-tech-main focus:ring-tech-main/20 bg-surface-input/50 focus:bg-surface-input py-3 font-mono text-lg backdrop-blur-sm transition-all duration-300 focus:ring-1 ${
              state.isReadOnly
                ? `bg-tech-main/5 cursor-not-allowed opacity-70`
                : `hover:bg-surface-input/80`
            } `}
            value={state.title}
            onChange={(e) => actions.setTitle(e.target.value)}
            readOnly={state.isReadOnly}
            aria-busy={state.isSaving}
          />
        </div>
      </div>

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

      {state.isSyncConflict ? (
        <div className="border-l-4 border-amber-500 bg-amber-500/10 p-4 text-amber-700">
          <p className="font-bold tracking-widest uppercase">
            {t("conflictTitle")}
          </p>
          <p className="text-sm">{t("conflictMessage")}</p>
        </div>
      ) : null}

      <DraftEditorFiles
        files={state.draftCollection.files}
        activeFileId={state.draftCollection.activeFileId}
        unsavedFileIds={state.unsavedFileIds}
        onSelectFile={(fileId) =>
          actions.setDraftCollection((current) => ({
            ...current,
            activeFileId: fileId,
          }))
        }
        onAddFile={handleAddFile}
        onRemoveFile={handleRemoveFile}
        isReadOnly={state.isReadOnly}
        activeFile={state.activeFile}
        activeFileIndex={state.activeFileIndex}
        activeFileHasDuplicatePath={state.activeFileHasDuplicatePath}
        duplicateFilePaths={state.duplicateFilePaths}
        onOpenFileDialog={actions.openFileDialog}
        onSetInsertDialogIntent={actions.setInsertDialogIntent}
      />

      <EditorContentArea>
        <DraftEditorToolbar
          activeTab={state.activeTab}
          onTabChange={actions.setActiveTab}
          activeFile={state.activeFile}
          activeFileIndex={state.activeFileIndex}
          lineWrap={state.lineWrap}
          onWrapToggle={() => actions.setLineWrap((v) => !v)}
          isReadOnly={state.isReadOnly}
          isUploading={upload.isUploading}
          fileInputRef={refs.fileInputRef}
          onFileSelect={actions.handleUploadWithAutoSave}
          isCompressing={upload.isCompressing}
          onInsertSyntax={actions.insertSyntax}
          onInsertText={actions.insertTextAtCursor}
          onUndo={actions.handleUndoDraftEdit}
          onRedo={actions.handleRedoDraftEdit}
          canUndo={Boolean(state.activeFileHistoryAvailability?.undoCount)}
          canRedo={Boolean(state.activeFileHistoryAvailability?.redoCount)}
        />

        <EditorBadge badge={badge.badge} onDismiss={badge.clearBadge} />

        <EditorWritePanel
          id="draft-editor-write-panel"
          hidden={state.activeTab !== "write"}>
          <EditorTextarea
            ref={refs.textareaRef}
            value={state.activeFileContent}
            onChange={(value) => actions.updateActiveFile({ content: value })}
            onUndo={actions.handleUndoDraftEdit}
            onRedo={actions.handleRedoDraftEdit}
            onPaste={actions.handlePaste}
            onDrop={actions.handleDrop}
            onDragOver={(e) => {
              if (!state.isReadOnly) e.preventDefault()
            }}
            onDragEnter={(e) => {
              if (!state.isReadOnly) e.preventDefault()
            }}
            isReadOnly={state.isReadOnly}
            isSaving={state.isSaving}
            placeholder={t("contentPlaceholder")}
            lineWrap={state.lineWrap}
            canUndo={Boolean(state.activeFileHistoryAvailability?.undoCount)}
            canRedo={Boolean(state.activeFileHistoryAvailability?.redoCount)}
            enableSyntaxHints
          />
        </EditorWritePanel>

        <EditorPreviewPanel
          id="draft-editor-preview-panel"
          hidden={state.activeTab !== "preview"}>
          <EditorPreviewFrame isEmpty={!state.activeFileContent.trim()}>
            <LazyMarkdownPreview
              content={state.activeFileContent}
              rawPath={state.activeFile.filePath || ""}
            />
          </EditorPreviewFrame>
        </EditorPreviewPanel>
      </EditorContentArea>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="border-tech-main/35 bg-surface-overlay/80 border backdrop-blur-sm">
          <div className="guide-line flex border-b">
            <button
              type="button"
              onClick={() => actions.setActiveInfoTab("changes")}
              className={`flex-1 px-4 py-3 font-mono text-xs tracking-widest uppercase ${
                state.activeInfoTab === "changes"
                  ? "bg-tech-main text-white"
                  : "text-tech-main hover:bg-tech-main/5"
              }`}>
              CHANGE MAP
            </button>
            <button
              type="button"
              onClick={() => actions.setActiveInfoTab("guide")}
              className={`guide-line flex-1 border-l px-4 py-3 font-mono text-xs tracking-widest uppercase ${
                state.activeInfoTab === "guide"
                  ? "bg-tech-main text-white"
                  : "text-tech-main hover:bg-tech-main/5"
              }`}>
              CONTRIBUTING
            </button>
          </div>

          {state.activeInfoTab === "changes" ? (
            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
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
                  value={String((state.draftCollection.folders || []).length)}
                />
              </div>

              {changeEntries.length === 0 ? (
                <p className="guide-line bg-tech-main/5 text-tech-main/60 border p-4 font-mono text-xs uppercase">
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
                <div className="guide-line bg-tech-main/5 border p-4">
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
              {state.contributingGuides.length === 0 ? (
                <p className="text-tech-main/60 font-mono text-xs uppercase">
                  NO_GUIDE_AVAILABLE_
                </p>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {state.contributingGuides.map((guide) => (
                      <TechButton
                        key={guide.id}
                        type="button"
                        variant={
                          state.activeGuideId === guide.id
                            ? "primary"
                            : "secondary"
                        }
                        size="sm"
                        onClick={() => actions.setActiveGuideId(guide.id)}>
                        {guide.title}
                      </TechButton>
                    ))}
                  </div>
                  <div className="max-h-136 overflow-y-auto pr-2">
                    <LazyMarkdownPreview
                      content={
                        state.contributingGuides.find(
                          (guide) => guide.id === state.activeGuideId
                        )?.content || state.contributingGuides[0].content
                      }
                      rawPath="CONTRIBUTING.md"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="border-tech-main/35 bg-surface-overlay/80 border p-4 backdrop-blur-sm">
          <p className="section-label">WORKSPACE OVERVIEW</p>
          <div className="space-y-3 font-mono text-xs uppercase">
            <InfoLine
              label="OPEN FILES"
              value={String(state.draftCollection.files.length)}
            />
            <InfoLine
              label="FOLDERS"
              value={String((state.draftCollection.folders || []).length)}
            />
            <InfoLine
              label="UNSAVED FILES"
              value={String(state.unsavedFileIds.size)}
            />
            <InfoLine
              label="ACTIVE FILE"
              value={state.activeFile.filePath || "PATH_NOT_SET"}
            />
            <InfoLine
              label="GITHUB BASE"
              value={describeSnapshotStatus(
                state.repoSnapshots[state.activeFile.id]
              )}
            />
          </div>
        </div>
      </section>

      {!state.isReadOnly && (
        <>
          <OperationProgress
            state={state.saveProgressState}
            title={progressT("saveDraftTitle")}
            stages={progress.saveProgressStages}
            successLabel={progressT("saveDraftSuccess")}
            errorLabel={progressT("saveDraftError")}
          />

          <OperationProgress
            state={state.submitProgressState}
            title={progressT("submitTitle")}
            stages={progress.submitProgressStages}
            successLabel={progressT("submitSuccess")}
            errorLabel={progressT("submitError")}
          />

          <EditorActions>
            <TechButton
              type="submit"
              variant="primary"
              disabled={state.saveDisabled}
              aria-busy={state.isSaving}>
              {state.isSaving
                ? t("savingLabel")
                : state.hasUnsavedChanges
                  ? `${t("saveButton")}_*`
                  : t("saveButton")}
            </TechButton>

            <TechButton
              type="button"
              variant="ghost"
              onClick={actions.handleSubmitReview}
              disabled={state.submitDisabled}
              aria-busy={state.isSubmittingReview}>
              {state.isSubmittingReview ? progressT("submitBusy") : t("openPr")}
            </TechButton>
          </EditorActions>

          <section
            aria-label={t("submissionLicenseAria")}
            className="guide-line bg-tech-main/5 text-tech-main/80 mt-4 border p-4 font-mono text-[0.6875rem] leading-relaxed">
            <div className="border-tech-main/15 mb-3 border-b pb-3">
              <p className="section-label">{t("syntaxHintsTitle")}</p>
              <p className="text-tech-main/70 mt-2">
                {t("syntaxHintsDescription")}
              </p>
              <p className="text-tech-main/55 mt-1">
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
                  className="decoration-tech-main/30 hover:text-tech-main-dark hover:decoration-tech-main-dark underline underline-offset-4 transition-colors">
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

function describeSnapshotStatus(snapshot?: RepoFileSnapshot) {
  if (!snapshot) return "CHECKING"
  if (snapshot.status === "missing") return "NEW_FILE"
  if (snapshot.status === "loading") return "LOADING"
  if (snapshot.status === "error") return "UNKNOWN"
  return "TRACKED"
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="guide-line bg-tech-main/5 border p-3">
      <p className="text-tech-main/55 font-mono text-[0.6875rem] tracking-widest uppercase">
        {label}
      </p>
      <p className="text-tech-main mt-2 font-mono text-lg uppercase">{value}</p>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-tech-main/10 flex items-start justify-between gap-3 border-b pb-2">
      <span className="text-tech-main/55">{label}</span>
      <span className="text-tech-main text-right break-all">{value}</span>
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
    <section className="guide-line bg-surface-overlay/70 border">
      <div className="guide-line bg-tech-main/5 flex items-center justify-between border-b px-4 py-3">
        <p className="text-tech-main font-mono text-xs tracking-widest break-all uppercase">
          {filePath}
        </p>
        <span
          className={`border px-2 py-1 font-mono text-[0.625rem] tracking-widest uppercase ${
            changeType === "new"
              ? `border-emerald-500/30 text-emerald-700`
              : changeType === "modified"
                ? `border-amber-500/30 text-amber-700`
                : `guide-line text-tech-main/55`
          } `}>
          {changeType}
        </span>
      </div>
      <div className="max-h-72 overflow-auto bg-slate-950/95 font-mono text-[0.6875rem] text-slate-100">
        {rows.map((row, index) => (
          <div
            key={`${filePath}-${row.type}-${row.oldLine ?? ""}-${row.newLine ?? ""}-${index}`}
            className={`grid grid-cols-[3rem_3rem_minmax(0,1fr)] px-2 py-1 ${
              row.type === "add"
                ? `bg-emerald-500/10 text-emerald-200`
                : row.type === "remove"
                  ? `bg-red-500/10 text-red-200`
                  : row.type === "skipped"
                    ? `bg-slate-800/70 text-slate-400`
                    : `text-slate-300`
            } `}>
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
