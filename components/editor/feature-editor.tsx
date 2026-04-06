"use client"

import * as React from "react"
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
import { EditorTabStrip } from "@/components/editor/editor-tab-strip"
import { EditorTextarea } from "@/components/editor/editor-textarea"
import { EditorFileUploadInput } from "@/components/editor/editor-file-upload-input"
import { LazyMarkdownPreview } from "@/components/editor/lazy-markdown-preview"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { useEditorUpload } from "@/hooks/use-editor-upload"

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
  const [title, setTitle] = React.useState(initialData?.title || "")
  const [content, setContent] = React.useState(initialData?.content || "")
  const [tags, setTags] = React.useState(initialData?.tags?.join(", ") || "")
  const [isSaving, setIsSaving] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">("write")
  const { badge, showBadge, clearBadge } = useBadge()

  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const isReadOnly = false

  const insertTextAtCursor = (text: string) => {
    if (!textareaRef.current) return
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const newContent =
      content.substring(0, start) + text + content.substring(end)
    setContent(newContent)

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
          start + text.length
        textareaRef.current.focus()
      }
    }, 0)
  }

  const featureUploadAdapter = React.useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/upload/feature", {
      method: "POST",
      body: formData,
    })

    if (res.status === 413) {
      throw new Error("File too large for upload.")
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Upload failed")

    return {
      url: data.url,
      filename: data.filename,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
    }
  }, [])

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
      showBadge("CANNOT_UPLOAD_BEFORE_SAVING_", "error", 4000)
      return
    }
    uploadFile(file)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (isReadOnly || isUploading) return
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      handleUploadWithCheck(file)
    }
  }

  const insertSyntax = (prefix: string, suffix: string = "") => {
    if (isReadOnly || !textareaRef.current) return
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const selectedText = content.substring(start, end)
    const newText = prefix + selectedText + suffix

    setContent(content.substring(0, start) + newText + content.substring(end))

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.selectionStart = start + prefix.length
        textareaRef.current.selectionEnd =
          start + prefix.length + selectedText.length
      }
    }, 0)
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
      showBadge("FEATURE_UPDATED_", "info", 3000)
    } catch (error: unknown) {
      console.error(error)
      showBadge(
        error instanceof Error ? error.message : "SAVE_FAILED_",
        "error"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="
        group relative flex w-full flex-col space-y-6 border border-tech-main
        bg-white/80 p-4 backdrop-blur-sm
        sm:p-6
      ">
      <CornerBrackets />

      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <label htmlFor="feature-title" className="section-label">
            TITLE_
          </label>
          <InputBox
            id="feature-title"
            required
            placeholder="ENTER TITLE..."
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
            TAGS_ (comma separated)
          </label>
          <InputBox
            id="feature-tags"
            placeholder="e.g. bug, enhancement, UI"
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

      <div
        className="
          relative editor-grow flex min-h-125 grow flex-col border
          border-tech-main/40 bg-white/80 backdrop-blur-sm
        ">
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

        <div
          id="editor-write-panel"
          role="tabpanel"
          className="editor-grow"
          hidden={activeTab !== "write"}>
          <div className="editor-surface">
            <EditorTextarea
              ref={textareaRef}
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setContent(e.target.value)
              }
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(e: React.DragEvent<HTMLTextAreaElement>) => {
                if (!isReadOnly) e.preventDefault()
              }}
              onDragEnter={(e: React.DragEvent<HTMLTextAreaElement>) => {
                if (!isReadOnly) e.preventDefault()
              }}
              isReadOnly={isReadOnly}
              isSaving={isSaving}
              placeholder="ENTER FEATURE DESCRIPTION... (Use Markdown)"
            />
          </div>
        </div>

        <div
          id="editor-preview-panel"
          role="tabpanel"
          hidden={activeTab !== "preview"}
          className="editor-grow">
          {content?.trim() ? (
            <div
              className="
                w-full max-w-none overflow-hidden p-6 wrap-break-word
                selection:bg-tech-main/20 selection:text-slate-900
                sm:p-8
              ">
              <LazyMarkdownPreview content={content} rawPath="" />
            </div>
          ) : (
            <p className="editor-panel">NOTHING_TO_PREVIEW_</p>
          )}
        </div>
      </div>

      {!isReadOnly && (
        <div
          className="
            relative mt-6 flex justify-end gap-4 border-t border-tech-main/10
            pt-4
          ">
          <div className="corner-tick" />

          <TechButton
            type="button"
            variant="ghost"
            onClick={() => router.back()}>
            CANCEL_
          </TechButton>

          <TechButton
            type="submit"
            variant="primary"
            disabled={isSaving}
            aria-busy={isSaving && initialData?.id ? true : false}>
            {isSaving && initialData?.id ? (
              <LoadingIndicator label={PENDING_LABELS.SAVING_FEATURE} />
            ) : isSaving ? (
              "SAVING..."
            ) : (
              "SAVE_FEATURE_"
            )}
          </TechButton>
        </div>
      )}
    </form>
  )
}
