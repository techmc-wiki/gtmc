"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { TechButton } from "@/components/ui/tech-button"
import { InputBox } from "@/components/ui/input-box"
import { normalizeDraftFilePath } from "@/lib/draft-files"

interface DraftRepoTreeNode {
  id: string
  title: string
  path: string
  isFolder: boolean
  children: DraftRepoTreeNode[]
}

interface DraftFileSourceDialogProps {
  isOpen: boolean
  initialFolderPath?: string
  onClose: () => void
  onCreate: (input: {
    content: string
    filePath: string
  }) => boolean | Promise<boolean>
}

type SourceMode = "repo" | "upload" | "new"

const ROOT_NODE: DraftRepoTreeNode = {
  id: "root",
  title: "ROOT",
  path: "",
  isFolder: true,
  children: [],
}

export function DraftFileSourceDialog({
  isOpen,
  initialFolderPath,
  onClose,
  onCreate,
}: DraftFileSourceDialogProps) {
  const t = useTranslations("DraftFiles")
  const [mode, setMode] = React.useState<SourceMode>("new")
  const [tree, setTree] = React.useState<DraftRepoTreeNode[]>([])
  const [isLoadingTree, setIsLoadingTree] = React.useState(false)
  const [treeError, setTreeError] = React.useState<string | null>(null)
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(
    () => new Set(["", initialFolderPath || ""])
  )
  const [selectedRepoFilePath, setSelectedRepoFilePath] = React.useState("")
  const [selectedFolderPath, setSelectedFolderPath] = React.useState(
    initialFolderPath || ""
  )
  const [newFileName, setNewFileName] = React.useState("")
  const [localFile, setLocalFile] = React.useState<File | null>(null)
  const [customUploadName, setCustomUploadName] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) {
      return
    }

    let disposed = false

    const loadTree = async () => {
      setIsLoadingTree(true)
      setTreeError(null)

      try {
        const response = await fetch("/api/draft/repo-tree", {
          cache: "no-store",
        })
        const data = (await response.json()) as {
          error?: string
          tree?: DraftRepoTreeNode[]
        }

        if (!response.ok) {
          throw new Error(data.error || t("repoError"))
        }

        if (!disposed) {
          setTree(data.tree || [])
        }
      } catch (error) {
        if (!disposed) {
          setTreeError(error instanceof Error ? error.message : t("repoError"))
        }
      } finally {
        if (!disposed) {
          setIsLoadingTree(false)
        }
      }
    }

    loadTree()

    return () => {
      disposed = true
    }
  }, [isOpen, t])

  React.useEffect(() => {
    if (!isOpen) {
      setMode("new")
      setSelectedRepoFilePath("")
      setSelectedFolderPath(initialFolderPath || "")
      setNewFileName("")
      setLocalFile(null)
      setCustomUploadName("")
      setTreeError(null)
      setIsSubmitting(false)
      setExpandedPaths(new Set(["", initialFolderPath || ""]))
    }
  }, [initialFolderPath, isOpen])

  if (!isOpen) {
    return null
  }

  const treeRoots = [{ ...ROOT_NODE, children: tree }]

  const handleTogglePath = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleAddRepoFile = async () => {
    if (!selectedRepoFilePath) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(
        `/api/draft/repo-file?path=${encodeURIComponent(selectedRepoFilePath)}`,
        { cache: "no-store" }
      )
      const data = (await response.json()) as {
        content?: string
        error?: string
        filePath?: string
      }

      if (!response.ok || typeof data.content !== "string") {
        throw new Error(data.error || t("repoError"))
      }

      const created = await onCreate({
        content: data.content,
        filePath: data.filePath || selectedRepoFilePath,
      })
      if (created !== false) {
        onClose()
      }
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : t("repoError"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateNewFile = () => {
    const filePath = buildDraftFilePath(selectedFolderPath, newFileName)
    if (!filePath) {
      setTreeError(t("fileNameValidationError"))
      return
    }

    Promise.resolve(onCreate({ content: "", filePath })).then((created) => {
      if (created !== false) {
        onClose()
      }
    })
  }

  const handleImportLocalFile = async () => {
    if (!localFile) {
      setTreeError(t("fileNameValidationError"))
      return
    }

    setIsSubmitting(true)

    try {
      const content = await localFile.text()
      const fallbackName = customUploadName.trim() || localFile.name
      const filePath = buildDraftFilePath(selectedFolderPath, fallbackName)

      if (!filePath) {
        throw new Error(t("fileNameValidationError"))
      }

      const created = await onCreate({ content, filePath })
      if (created !== false) {
        onClose()
      }
    } catch (error) {
      setTreeError(error instanceof Error ? error.message : t("repoError"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmitRepo = Boolean(selectedRepoFilePath) && !isSubmitting
  const canSubmitNew = Boolean(
    buildDraftFilePath(selectedFolderPath, newFileName)
  )
  const canSubmitUpload = Boolean(localFile) && !isSubmitting

  return (
    <div
      className="
        fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4
        backdrop-blur-sm
      ">
      <div
        className="
          flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden border
          border-tech-main bg-white shadow-2xl
        ">
        <div
          className="
            flex items-center justify-between border-b guide-line bg-tech-main/5
            px-5 py-4
          ">
          <div>
            <p
              className="
                font-mono text-sm tracking-widest text-tech-main uppercase
              ">
              {t("dialogTitle")}
            </p>
            <p className="mt-1 font-mono text-xs text-tech-main/60 uppercase">
              {t("dialogSubtitle")}
            </p>
          </div>
          <TechButton type="button" variant="ghost" size="sm" onClick={onClose}>
            {t("close")}
          </TechButton>
        </div>

        <div
          className="
            grid min-h-0 flex-1 gap-0
            lg:grid-cols-[20rem_minmax(0,1fr)]
          ">
          <aside className="flex min-h-0 flex-col border-r guide-line bg-tech-main/5">
            <div
              className="
                shrink-0 border-b guide-line px-4 py-3 font-mono text-xs
                tracking-widest text-tech-main uppercase
              ">
              {t("destinationTree")}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {isLoadingTree ? (
                <p className="font-mono text-xs text-tech-main/60">
                  {t("loadingRepo")}
                </p>
              ) : (
                <div className="space-y-1">
                  {treeRoots.map((node) => (
                    <TreeNode
                      key={node.id}
                      expandedPaths={expandedPaths}
                      mode={mode}
                      node={node}
                      onSelectFile={setSelectedRepoFilePath}
                      onSelectFolder={setSelectedFolderPath}
                      onTogglePath={handleTogglePath}
                      selectedFilePath={selectedRepoFilePath}
                      selectedFolderPath={selectedFolderPath}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5">
            <div className="mb-5 flex flex-wrap gap-2">
              <ModeButton
                label={t("modeRepo")}
                mode="repo"
                value={mode}
                onChange={setMode}
              />
              <ModeButton
                label={t("modeLocal")}
                mode="upload"
                value={mode}
                onChange={setMode}
              />
              <ModeButton
                label={t("modeNew")}
                mode="new"
                value={mode}
                onChange={setMode}
              />
            </div>

            {treeError ? (
              <div
                className="
                  mb-4 border border-red-500/30 bg-red-500/10 px-4 py-3
                  font-mono text-xs text-red-700
                ">
                {treeError}
              </div>
            ) : null}

            {mode === "repo" ? (
              <div className="space-y-4">
                <SectionLabel>{t("selectExistingFile")}</SectionLabel>
                <p className="font-mono text-xs text-tech-main/60 uppercase">
                  {t("selected")}: {selectedRepoFilePath || "NONE"}
                </p>
                <TechButton
                  type="button"
                  variant="primary"
                  onClick={handleAddRepoFile}
                  disabled={!canSubmitRepo}>
                  {isSubmitting ? t("adding") : t("addExistingFile")}
                </TechButton>
              </div>
            ) : null}

            {mode === "upload" ? (
              <div className="space-y-4">
                <SectionLabel>{t("importLocalText")}</SectionLabel>
                <p className="font-mono text-xs text-tech-main/60 uppercase">
                  {t("destinationFolder")}: {selectedFolderPath || "ROOT"}
                </p>
                <input
                  type="file"
                  accept=".md,.mdx,.txt,.csv,.json,.yml,.yaml"
                  className="block w-full font-mono text-xs text-tech-main"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    const file = event.target.files?.[0] || null
                    setLocalFile(file)
                    setCustomUploadName(file?.name || "")
                  }}
                />
                <div className="space-y-2">
                  <label className="section-label" htmlFor="draft-import-name">
                    {t("fileNameLabel")}
                  </label>
                  <InputBox
                    id="draft-import-name"
                    placeholder={t("repoFileNamePlaceholder")}
                    value={customUploadName}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setCustomUploadName(event.target.value)
                    }
                  />
                </div>
                <TechButton
                  type="button"
                  variant="primary"
                  onClick={handleImportLocalFile}
                  disabled={!canSubmitUpload}>
                  {isSubmitting ? t("importing") : t("importLocalFile")}
                </TechButton>
              </div>
            ) : null}

            {mode === "new" ? (
              <div className="space-y-4">
                <SectionLabel>{t("createNewFile")}</SectionLabel>
                <p className="font-mono text-xs text-tech-main/60 uppercase">
                  {t("destinationFolder")}: {selectedFolderPath || "ROOT"}
                </p>
                <div className="space-y-2">
                  <label
                    className="section-label"
                    htmlFor="draft-new-file-name">
                    {t("fileNameLabel")}
                  </label>
                  <InputBox
                    id="draft-new-file-name"
                    placeholder={t("newFileNamePlaceholder")}
                    value={newFileName}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setNewFileName(event.target.value)
                    }
                  />
                </div>
                <div className="font-mono text-xs text-tech-main/60 uppercase">
                  {t("result")}:{" "}
                  {buildDraftFilePath(selectedFolderPath, newFileName) ||
                    t("pending")}
                </div>
                <TechButton
                  type="button"
                  variant="primary"
                  onClick={handleCreateNewFile}
                  disabled={!canSubmitNew}>
                  {t("createEmptyFile")}
                </TechButton>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function ModeButton({
  label,
  mode,
  onChange,
  value,
}: {
  label: string
  mode: SourceMode
  onChange: (mode: SourceMode) => void
  value: SourceMode
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(mode)}
      className={`
        border px-3 py-2 font-mono text-xs tracking-widest uppercase
        transition-colors
        ${
          value === mode
            ? `border-tech-main bg-tech-main text-white`
            : `
              border-tech-main/30 bg-tech-main/5 text-tech-main
              hover:bg-tech-main/10
            `
        }
      `}>
      {label}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-sm tracking-widest text-tech-main uppercase">
      {children}
    </p>
  )
}

function TreeNode({
  expandedPaths,
  mode,
  node,
  onSelectFile,
  onSelectFolder,
  onTogglePath,
  selectedFilePath,
  selectedFolderPath,
}: {
  expandedPaths: Set<string>
  mode: SourceMode
  node: DraftRepoTreeNode
  onSelectFile: (path: string) => void
  onSelectFolder: (path: string) => void
  onTogglePath: (path: string) => void
  selectedFilePath: string
  selectedFolderPath: string
}) {
  const isExpanded = expandedPaths.has(node.path)
  const isFolderSelected = selectedFolderPath === node.path
  const isFileSelected = selectedFilePath === node.path
  const isSelectableFolder = mode === "new" || mode === "upload"
  const isSelectableFile = mode === "repo"

  return (
    <div className="space-y-0.5">
      <div className="group relative flex items-center">
        {node.isFolder ? (
          <button
            type="button"
            onClick={() => onTogglePath(node.path)}
            className="
              flex h-8 w-6 shrink-0 items-center justify-center font-mono
              text-[0.625rem] text-tech-main/50 transition-colors
              hover:text-tech-main
            ">
            {isExpanded ? "▼" : "▶"}
          </button>
        ) : (
          <span
            className="
              inline-flex h-8 w-6 shrink-0 items-center justify-center font-mono
              text-[0.625rem] text-tech-main/20
            ">
            ·
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            if (node.isFolder && isSelectableFolder) {
              onSelectFolder(node.path)
              return
            }

            if (!node.isFolder && isSelectableFile) {
              onSelectFile(node.path)
            }
          }}
          className={`
            flex min-h-8 flex-1 items-center px-1 text-left font-mono
            text-[0.875rem] tracking-wide transition-colors
            ${
              node.isFolder
                ? isFolderSelected
                  ? `bg-tech-main/10 font-bold text-tech-main`
                  : `font-bold text-tech-main/80`
                : isFileSelected
                  ? `bg-tech-main/10 font-bold text-tech-main`
                  : `text-tech-main/70`
            }
            ${
              (node.isFolder && isSelectableFolder) ||
              (!node.isFolder && isSelectableFile)
                ? `hover:bg-tech-main/5 hover:text-tech-main`
                : `cursor-default opacity-60`
            }
          `}>
          <span className="truncate">{node.title}</span>
        </button>
      </div>

      {node.children.length > 0 && isExpanded ? (
        <div className="ml-3 border-l border-tech-main/10 pl-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              expandedPaths={expandedPaths}
              mode={mode}
              node={child}
              onSelectFile={onSelectFile}
              onSelectFolder={onSelectFolder}
              onTogglePath={onTogglePath}
              selectedFilePath={selectedFilePath}
              selectedFolderPath={selectedFolderPath}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function buildDraftFilePath(folderPath: string, rawFileName: string) {
  const normalizedFolder = normalizeDraftFilePath(folderPath)
  const sanitizedName = normalizeDraftFilePath(rawFileName)
    .split("/")
    .filter(Boolean)
    .at(-1)

  if (!sanitizedName) {
    return ""
  }

  const fileName = sanitizedName.endsWith(".md")
    ? sanitizedName
    : `${sanitizedName}.md`
  return normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName
}
