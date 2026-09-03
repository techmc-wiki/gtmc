"use client"

import * as React from "react"
import useSWR from "swr"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/shadcn/button"
import { Input } from "@/components/ui/shadcn/input"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/shadcn/tabs"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/shadcn/dialog"
import { normalizeDraftFilePath } from "@/lib/drafts/files"

interface DraftRepoTreeNode {
  id: string
  title: string
  path: string
  isFolder: boolean
  children: DraftRepoTreeNode[]
}

async function fetchDraftRepoTree() {
  const response = await fetch("/api/draft/repo-tree", {
    cache: "no-store",
  })
  const data = (await response.json()) as {
    error?: string
    tree?: DraftRepoTreeNode[]
  }

  if (!response.ok) {
    throw new Error(data.error || "Unable to load repository tree")
  }

  return data.tree || []
}

interface DraftFileSourceDialogProps {
  isOpen: boolean
  initialFolderPath?: string
  initialMode?: SourceMode
  onClose: () => void
  onCreateFolder?: (folderPath: string) => boolean | Promise<boolean>
  onCreate: (input: {
    content: string
    filePath: string
  }) => boolean | Promise<boolean>
}

export type SourceMode = "folder" | "repo" | "upload" | "new"

const ROOT_NODE: DraftRepoTreeNode = {
  id: "root",
  title: "ROOT",
  path: "",
  isFolder: true,
  children: [],
}

function useDraftFileSourceDialog({
  isOpen,
  initialFolderPath,
  initialMode = "new",
  onClose,
  onCreateFolder,
  onCreate,
}: DraftFileSourceDialogProps) {
  const t = useTranslations("DraftFiles")
  const [mode, setMode] = React.useState<SourceMode>(initialMode)
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(
    () => new Set(["", initialFolderPath || ""])
  )
  const [selectedRepoFilePath, setSelectedRepoFilePath] = React.useState("")
  const [selectedFolderPath, setSelectedFolderPath] = React.useState(
    initialFolderPath || ""
  )
  const [newFileName, setNewFileName] = React.useState("")
  const [newFolderName, setNewFolderName] = React.useState("")
  const [localFile, setLocalFile] = React.useState<File | null>(null)
  const [customUploadName, setCustomUploadName] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const sourceModeOptions = React.useMemo(
    () => [
      { value: "repo" as const, label: t("modeRepo") },
      { value: "upload" as const, label: t("modeLocal") },
      { value: "new" as const, label: t("modeNew") },
      { value: "folder" as const, label: "新建文件夹" },
    ],
    [t]
  )

  const {
    data: tree = [],
    error: treeFetchError,
    isLoading: isLoadingTree,
  } = useSWR<DraftRepoTreeNode[]>(
    isOpen ? "/api/draft/repo-tree" : null,
    fetchDraftRepoTree
  )
  const [localTreeError, setLocalTreeError] = React.useState<string | null>(
    null
  )
  const treeError = treeFetchError
    ? treeFetchError instanceof Error
      ? treeFetchError.message
      : t("repoError")
    : localTreeError

  const handleTogglePath = React.useCallback((path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const handleAddRepoFile = React.useCallback(async () => {
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
      if (created) {
        onClose()
      }
    } catch (error) {
      setLocalTreeError(error instanceof Error ? error.message : t("repoError"))
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedRepoFilePath, onCreate, onClose, t])

  const handleCreateNewFile = React.useCallback(() => {
    const filePath = buildDraftFilePath(selectedFolderPath, newFileName)
    if (!filePath) {
      setLocalTreeError(t("fileNameValidationError"))
      return
    }

    Promise.resolve(onCreate({ content: "", filePath })).then((created) => {
      if (created) {
        onClose()
      }
    })
  }, [selectedFolderPath, newFileName, onCreate, onClose, t])

  const handleCreateNewFolder = React.useCallback(() => {
    const normalizedFolderName = normalizeDraftFilePath(newFolderName)
      .replace(/\/$/, "")
      .split("/")
      .pop()

    if (!normalizedFolderName || !onCreateFolder) {
      setLocalTreeError(t("fileNameValidationError"))
      return
    }

    const folderPath = [selectedFolderPath, normalizedFolderName]
      .filter(Boolean)
      .join("/")

    Promise.resolve(onCreateFolder(folderPath)).then((created) => {
      if (created) {
        onClose()
      }
    })
  }, [newFolderName, selectedFolderPath, onCreateFolder, onClose, t])

  const handleImportLocalFile = React.useCallback(async () => {
    if (!localFile) {
      setLocalTreeError(t("fileNameValidationError"))
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
      if (created) {
        onClose()
      }
    } catch (error) {
      setLocalTreeError(error instanceof Error ? error.message : t("repoError"))
    } finally {
      setIsSubmitting(false)
    }
  }, [localFile, customUploadName, selectedFolderPath, onCreate, onClose, t])

  const handleFileInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null
      setLocalFile(file)
      setCustomUploadName(file?.name || "")
    },
    []
  )

  const handleNewFileNameChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setNewFileName(event.target.value),
    []
  )

  const handleNewFolderNameChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setNewFolderName(event.target.value),
    []
  )

  const handleCustomUploadNameChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setCustomUploadName(event.target.value),
    []
  )

  return {
    canSubmitNew: Boolean(buildDraftFilePath(selectedFolderPath, newFileName)),
    canSubmitRepo: Boolean(selectedRepoFilePath) && !isSubmitting,
    canSubmitUpload: Boolean(localFile) && !isSubmitting,
    customUploadName,
    expandedPaths,
    handleAddRepoFile,
    handleCreateNewFile,
    handleCreateNewFolder,
    handleCustomUploadNameChange,
    handleFileInputChange,
    handleImportLocalFile,
    handleNewFileNameChange,
    handleNewFolderNameChange,
    handleTogglePath,
    isLoadingTree,
    isSubmitting,
    mode,
    newFileName,
    newFolderName,
    selectedFolderPath,
    selectedRepoFilePath,
    setMode,
    setSelectedFolderPath,
    setSelectedRepoFilePath,
    sourceModeOptions,
    tree,
    treeError,
  }
}

type DraftFileSourceDialogState = ReturnType<typeof useDraftFileSourceDialog>

export function DraftFileSourceDialog(props: DraftFileSourceDialogProps) {
  const dialog = useDraftFileSourceDialog(props)
  if (!props.isOpen) return null

  return <DraftFileSourceDialogLayout dialog={dialog} onClose={props.onClose} />
}

function DraftFileSourceDialogLayout({
  dialog,
  onClose,
}: {
  dialog: DraftFileSourceDialogState
  onClose: () => void
}) {
  const t = useTranslations("DraftFiles")
  const treeRoots = [{ ...ROOT_NODE, children: dialog.tree }]

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}>
      <DialogContent
        showCloseButton={false}
        className="border-tech-main bg-surface-modal top-1/2 left-1/2 max-h-[90vh] w-full max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden border shadow-2xl">
        <div className="guide-line bg-tech-main/5 flex items-center justify-between border-b px-5 py-4">
          <div>
            <DialogTitle className="text-tech-main-dark text-sm font-semibold">
              {t("dialogTitle")}
            </DialogTitle>
            <p className="text-tech-main/60 mt-1 text-xs">
              {t("dialogSubtitle")}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="guide-line bg-tech-main/5 flex min-h-0 flex-col border-r">
            <div className="guide-line text-tech-main/60 shrink-0 border-b px-4 py-3 text-xs font-medium">
              {t("destinationTree")}
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {dialog.isLoadingTree ? (
                <p className="text-tech-main/60 font-mono text-xs">
                  {t("loadingRepo")}
                </p>
              ) : (
                <div className="space-y-1">
                  {treeRoots.map((node) => (
                    <TreeNode
                      key={node.id}
                      expandedPaths={dialog.expandedPaths}
                      mode={dialog.mode}
                      node={node}
                      onSelectFile={dialog.setSelectedRepoFilePath}
                      onSelectFolder={dialog.setSelectedFolderPath}
                      onTogglePath={dialog.handleTogglePath}
                      selectedFilePath={dialog.selectedRepoFilePath}
                      selectedFolderPath={dialog.selectedFolderPath}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>
          <DraftFileSourcePanels dialog={dialog} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DraftFileSourcePanels({
  dialog,
}: {
  dialog: DraftFileSourceDialogState
}) {
  const t = useTranslations("DraftFiles")
  return (
    <div className="min-h-0 overflow-y-auto p-5">
      <Tabs
        value={dialog.mode}
        onValueChange={(value) => dialog.setMode(value as SourceMode)}
        className="gap-2">
        <TabsList>
          {dialog.sourceModeOptions.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {dialog.treeError ? (
          <div className="mb-4 border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-xs text-red-700">
            {dialog.treeError}
          </div>
        ) : null}
        <TabsContent value="repo" className="space-y-4">
          <SectionLabel>{t("selectExistingFile")}</SectionLabel>
          <p className="text-tech-main/60 text-xs">
            {t("selected")}: {dialog.selectedRepoFilePath || "NONE"}
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={dialog.handleAddRepoFile}
            disabled={!dialog.canSubmitRepo}>
            {dialog.isSubmitting ? t("adding") : t("addExistingFile")}
          </Button>
        </TabsContent>
        <TabsContent value="upload" className="space-y-4">
          <SectionLabel>{t("importLocalText")}</SectionLabel>
          <p className="text-tech-main/60 text-xs">
            {t("destinationFolder")}: {dialog.selectedFolderPath || "ROOT"}
          </p>
          <input
            type="file"
            accept=".md,.mdx,.txt,.csv,.json,.yml,.yaml"
            className="text-tech-main block w-full font-mono text-xs"
            aria-label={t("importLocalText")}
            onChange={dialog.handleFileInputChange}
          />
          <div className="space-y-2">
            <label
              className="text-tech-main/60 text-xs font-medium"
              htmlFor="draft-import-name">
              {t("fileNameLabel")}
            </label>
            <Input
              id="draft-import-name"
              placeholder={t("repoFileNamePlaceholder")}
              value={dialog.customUploadName}
              onChange={dialog.handleCustomUploadNameChange}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={dialog.handleImportLocalFile}
            disabled={!dialog.canSubmitUpload}>
            {dialog.isSubmitting ? t("importing") : t("importLocalFile")}
          </Button>
        </TabsContent>
        <TabsContent value="new" className="space-y-4">
          <SectionLabel>{t("createNewFile")}</SectionLabel>
          <p className="text-tech-main/60 text-xs">
            {t("destinationFolder")}: {dialog.selectedFolderPath || "ROOT"}
          </p>
          <div className="space-y-2">
            <label
              className="text-tech-main/60 text-xs font-medium"
              htmlFor="draft-new-file-name">
              {t("fileNameLabel")}
            </label>
            <Input
              id="draft-new-file-name"
              placeholder={t("newFileNamePlaceholder")}
              value={dialog.newFileName}
              onChange={dialog.handleNewFileNameChange}
            />
          </div>
          <div className="text-tech-main/60 text-xs">
            {t("result")}:{" "}
            {buildDraftFilePath(
              dialog.selectedFolderPath,
              dialog.newFileName
            ) || t("pending")}
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={dialog.handleCreateNewFile}
            disabled={!dialog.canSubmitNew}>
            {t("createEmptyFile")}
          </Button>
        </TabsContent>
        <TabsContent value="folder" className="space-y-4">
          <SectionLabel>新建文件夹</SectionLabel>
          <p className="text-tech-main/60 text-xs">
            {t("destinationFolder")}: {dialog.selectedFolderPath || "ROOT"}
          </p>
          <div className="space-y-2">
            <label
              className="text-tech-main/60 text-xs font-medium"
              htmlFor="draft-new-folder-name">
              {t("fileNameLabel")}
            </label>
            <Input
              id="draft-new-folder-name"
              placeholder="例如：new-section"
              value={dialog.newFolderName}
              onChange={dialog.handleNewFolderNameChange}
            />
          </div>
          <div className="text-tech-main/60 text-xs">
            {t("result")}:{" "}
            {[dialog.selectedFolderPath, dialog.newFolderName.trim()]
              .filter(Boolean)
              .join("/") || t("pending")}
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={dialog.handleCreateNewFolder}
            disabled={!dialog.newFolderName.trim()}>
            创建文件夹
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-tech-main/60 text-xs font-medium">{children}</p>
}

interface TreeNodeProps {
  expandedPaths: Set<string>
  mode: SourceMode
  node: DraftRepoTreeNode
  onSelectFile: (path: string) => void
  onSelectFolder: (path: string) => void
  onTogglePath: (path: string) => void
  selectedFilePath: string
  selectedFolderPath: string
}

function TreeNodeToggle({
  isExpanded,
  node,
  onToggle,
}: {
  isExpanded: boolean
  node: DraftRepoTreeNode
  onToggle: () => void
}) {
  if (!node.isFolder) {
    return (
      <span className="text-tech-main/20 inline-flex h-8 w-6 shrink-0 items-center justify-center font-mono text-[0.625rem]">
        ·
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        isExpanded ? `Collapse ${node.title}` : `Expand ${node.title}`
      }
      className="text-tech-main/50 hover:text-tech-main flex h-8 w-6 shrink-0 items-center justify-center font-mono text-[0.625rem] transition-colors">
      <span aria-hidden="true">{isExpanded ? "▼" : "▶"}</span>
    </button>
  )
}

function getTreeNodeLabelClassName({
  isFileSelected,
  isFolder,
  isFolderSelected,
  isSelectableFile,
  isSelectableFolder,
}: {
  isFileSelected: boolean
  isFolder: boolean
  isFolderSelected: boolean
  isSelectableFile: boolean
  isSelectableFolder: boolean
}) {
  const selectionClassName = isFolder
    ? isFolderSelected
      ? "bg-tech-main/10 text-tech-main font-bold"
      : "text-tech-main/80 font-bold"
    : isFileSelected
      ? "bg-tech-main/10 text-tech-main font-bold"
      : "text-tech-main/70"
  const interactionClassName =
    (isFolder && isSelectableFolder) || (!isFolder && isSelectableFile)
      ? "hover:bg-tech-main/5 hover:text-tech-main"
      : "cursor-default opacity-60"

  return `flex min-h-8 flex-1 items-center px-1 text-left font-mono text-[0.875rem] tracking-wide transition-colors ${selectionClassName} ${interactionClassName}`
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
}: TreeNodeProps) {
  const isExpanded = expandedPaths.has(node.path)
  const isFolderSelected = selectedFolderPath === node.path
  const isFileSelected = selectedFilePath === node.path
  const isSelectableFolder =
    mode === "new" || mode === "upload" || mode === "folder"
  const isSelectableFile = mode === "repo"

  const handleToggle = React.useCallback(
    () => onTogglePath(node.path),
    [onTogglePath, node.path]
  )

  const handleSelect = React.useCallback(() => {
    if (node.isFolder && isSelectableFolder) {
      onSelectFolder(node.path)
      return
    }

    if (!node.isFolder && isSelectableFile) {
      onSelectFile(node.path)
    }
  }, [
    node.isFolder,
    node.path,
    isSelectableFolder,
    isSelectableFile,
    onSelectFolder,
    onSelectFile,
  ])

  return (
    <div className="space-y-0.5">
      <div className="group relative flex items-center">
        <TreeNodeToggle
          isExpanded={isExpanded}
          node={node}
          onToggle={handleToggle}
        />

        <button
          type="button"
          onClick={handleSelect}
          className={getTreeNodeLabelClassName({
            isFileSelected,
            isFolder: node.isFolder,
            isFolderSelected,
            isSelectableFile,
            isSelectableFolder,
          })}>
          <span className="truncate">{node.title}</span>
        </button>
      </div>

      {node.children.length > 0 && isExpanded ? (
        <div className="border-tech-main/10 ml-3 border-l pl-2">
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
    .replace(/\/$/, "")
    .split("/")
    .pop()

  if (!sanitizedName) {
    return ""
  }

  const fileName = sanitizedName.endsWith(".md")
    ? sanitizedName
    : `${sanitizedName}.md`
  return normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName
}
