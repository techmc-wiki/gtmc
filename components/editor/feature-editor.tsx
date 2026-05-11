"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { TechButton } from "../ui/tech-button"
import { InputBox } from "../ui/input-box"
import { useRouter } from "@/i18n/navigation"
import { updateFeature } from "@/actions/feature"
import { useBadge } from "@/hooks/use-badge"
import {
  LoadingIndicator,
  PENDING_LABELS,
} from "@/components/ui/loading-indicator"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { EditorBadge } from "@/components/editor/editor-badge"
import {
  EditorTabStrip,
  type TabType,
} from "@/components/editor/editor-tab-strip"
import { EditorTextarea } from "@/components/editor/editor-textarea"
import { EditorFileUploadInput } from "@/components/editor/editor-file-upload-input"
import { LazyMarkdownPreview } from "@/components/editor/lazy-markdown-preview"
import { useEditorUpload } from "@/hooks/use-editor-upload"
import { EditorForm, EditorActions } from "@/components/editor/editor-surface"
import {
  EditorContentArea,
  EditorWritePanel,
  EditorPreviewPanel,
  EditorPreviewFrame,
} from "@/components/editor/editor-preview-frame"

interface FeatureEditorProps {
  initialData?: {
    id?: string
    title: string
    content: string
    tags?: string[]
    status?: string
  }
}

export function FeatureEditor({ initialData }: FeatureEditorProps) {
  const router = useRouter()
  const t = useTranslations("Editor")
  const tLoading = useTranslations("Loading")
  const [title, setTitle] = React.useState(initialData?.title || "")
  const [content, setContent] = React.useState(initialData?.content || "")
  const [tags, setTags] = React.useState(initialData?.tags?.join(", ") || "")
  const [isSaving, setIsSaving] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<TabType>("write")
  const [lineWrap, setLineWrap] = React.useState(false)
  const { badge, showBadge, clearBadge } = useBadge()

  const textareaRef = React.useRef<any>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const isReadOnly = false

  const insertTextAtCursor = (text: string) => {
    if (!textareaRef.current) return
    const view = textareaRef.current.view
    if (!view) return

    const selection = view.state.selection.main

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: text,
      },
      selection: {
        anchor: selection.from + text.length,
        head: selection.from + text.length,
      },
    })

    view.focus()
  }

  const featureUploadAdapter = React.useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/upload/feature", {
        method: "POST",
        body: formData,
      })

      if (res.status === 413) {
        throw new Error(t("errorFileTooLarge"))
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("errorUploadFailed"))

      return {
        url: data.url,
        filename: data.filename,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
      }
    },
    [t]
  )

  const { uploadFile, isUploading, isCompressing } = useEditorUpload({
    adapter: featureUploadAdapter,
    onInsertContent: (text: string) => {
      if (text === "") {
        setContent((prev) =>
          prev.replace(/<!-- UPLOAD_PENDING_[a-f0-9-]+ -->\n?/g, "")
        )
      } else if (text.startsWith("<!--")) {
        insertTextAtCursor(text)
      } else {
        setContent((prev) =>
          prev.replace(/<!-- UPLOAD_PENDING_[a-f0-9-]+ -->/, text)
        )
      }
    },
    onShowBadge: (message: string, type: "info" | "error" | "progress") => {
      showBadge(message, type)
    },
    onClearBadge: clearBadge,
  })

  const handleUploadWithCheck = (file: File) => {
    if (!initialData?.id) {
      showBadge(t("badgeCannotUploadBeforeSaving"), "error", 4000)
      return
    }
    uploadFile(file)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (isReadOnly || isUploading) return
    const items = e.clipboardData.items
    for (const item of Array.from(items)) {
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          handleUploadWithCheck(file)
        }
        break
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (isReadOnly || isUploading) return
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      handleUploadWithCheck(file)
    }
  }

  const insertSyntax = (prefix: string, suffix: string = "") => {
    if (isReadOnly || !textareaRef.current) return
    const view = textareaRef.current.view
    if (!view) return

    const selection = view.state.selection.main
    const selectedText = view.state.sliceDoc(selection.from, selection.to)
    const newText = prefix + selectedText + suffix

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: newText,
      },
      selection: {
        anchor: selection.from + prefix.length,
        head: selection.from + prefix.length + selectedText.length,
      },
    })

    view.focus()
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    if (!initialData?.id) {
      sessionStorage.setItem(
        "pendingFeatureCreate.v1",
        JSON.stringify({ title, content, tags: tagArray })
      )
      router.push("/features?created=true")
      return
    }

    setIsSaving(true)
    try {
      await updateFeature(initialData.id, {
        title,
        content,
        tags: tagArray,
      })
      showBadge(t("badgeFeatureUpdated"), "info", 3000)
    } catch (error: unknown) {
      console.error(error)
      showBadge(
        error instanceof Error ? error.message : t("badgeSaveFailed"),
        "error"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EditorForm onSubmit={handleSave}>
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <label htmlFor="feature-title" className="section-label">
            {t("titleLabel")}
          </label>
          <InputBox
            id="feature-title"
            required
            placeholder={t("titlePlaceholder")}
            className={`
              border-tech-main/40 py-3 font-mono text-lg backdrop-blur-sm
              focus:border-tech-main/60
              ${
                isReadOnly
                  ? `cursor-not-allowed bg-gray-100 opacity-70`
                  : `bg-white/80`
              }
            `}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={isReadOnly}
            aria-busy={isSaving}
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label htmlFor="feature-tags" className="section-label">
            {t("tagsLabel")}
          </label>
          <InputBox
            id="feature-tags"
            placeholder={t("tagsPlaceholder")}
            className={`
              border-tech-main/40 py-2 font-mono text-sm backdrop-blur-sm
              focus:border-tech-main/60
              ${
                isReadOnly
                  ? `cursor-not-allowed bg-gray-100 opacity-70`
                  : `bg-white/80`
              }
            `}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            readOnly={isReadOnly}
            aria-busy={isSaving}
          />
        </div>
      </div>

      <EditorContentArea>
        {/* Tab strip */}
        <EditorTabStrip
          activeTab={activeTab}
          onTabChange={setActiveTab}
          writeId="editor-write-panel"
          previewId="editor-preview-panel"
        />

        <EditorBadge badge={badge} onDismiss={clearBadge} />

        {activeTab === "write" && (
          <>
            <EditorToolbar
              onInsert={insertSyntax}
              disabled={isReadOnly || isUploading}
              lineWrap={lineWrap}
              onWrapToggle={() => setLineWrap((v) => !v)}
              fileUploadSlot={
                <EditorFileUploadInput
                  fileInputRef={fileInputRef}
                  onFileSelect={handleUploadWithCheck}
                  isUploading={isUploading}
                  isCompressing={isCompressing}
                  disabled={isReadOnly}
                />
              }
            />
          </>
        )}

        <EditorWritePanel
          id="editor-write-panel"
          hidden={activeTab !== "write"}>
          <EditorTextarea
            ref={textareaRef}
            value={content}
            onChange={(value: string) => setContent(value)}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
              if (!isReadOnly) e.preventDefault()
            }}
            onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
              if (!isReadOnly) e.preventDefault()
            }}
            isReadOnly={isReadOnly}
            isSaving={isSaving}
            placeholder={t("bodyPlaceholder")}
            lineWrap={lineWrap}
          />
        </EditorWritePanel>

        <EditorPreviewPanel
          id="editor-preview-panel"
          hidden={activeTab !== "preview"}>
          <EditorPreviewFrame isEmpty={!content?.trim()}>
            <LazyMarkdownPreview content={content} rawPath="" />
          </EditorPreviewFrame>
        </EditorPreviewPanel>
      </EditorContentArea>

      {!isReadOnly && (
        <EditorActions>
          <TechButton
            type="button"
            variant="ghost"
            onClick={() => router.back()}>
            {t("cancelButton")}
          </TechButton>

          <TechButton
            type="submit"
            variant="primary"
            disabled={isSaving}
            aria-busy={!!(isSaving && initialData?.id)}>
            {isSaving && initialData?.id ? (
              <LoadingIndicator label={PENDING_LABELS.SAVING_FEATURE} />
            ) : isSaving ? (
              tLoading("saving")
            ) : (
              t("saveButton")
            )}
          </TechButton>
        </EditorActions>
      )}
    </EditorForm>
  )
}
