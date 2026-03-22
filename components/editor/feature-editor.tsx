"use client"

import * as React from "react"
import { BrutalButton } from "../ui/brutal-button"
import { BrutalInput } from "../ui/brutal-input"
import { useRouter } from "next/navigation"
import { updateFeature } from "@/actions/feature"
import { upload } from "@vercel/blob/client"
import { compressImageForUpload } from "@/lib/image-compression"
import {
  LoadingIndicator,
  PENDING_LABELS,
} from "@/app/(dashboard)/features/loading-indicator"
import { MarkdownContent } from "@/components/markdown/markdown-content"
import {
  classifyFile,
  isImageMime,
  sanitizeFilename,
  generateMarkdownBlock,
  VERCEL_BODY_LIMIT_BYTES,
} from "@/lib/file-upload"

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
  const [content, setContent] = React.useState(
    initialData?.content || "",
  )
  const [tags, setTags] = React.useState(
    initialData?.tags?.join(", ") || "",
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isCompressing, setIsCompressing] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<
    "write" | "preview"
  >("write")

  type BadgeType = "info" | "error" | "progress"
  const [badge, setBadge] = React.useState<{
    message: string
    type: BadgeType
  } | null>(null)
  const badgeTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null)

  const showBadge = (
    message: string,
    type: BadgeType,
    autoClearMs?: number,
  ) => {
    if (badgeTimeoutRef.current) clearTimeout(badgeTimeoutRef.current)
    setBadge({ message, type })
    if (autoClearMs) {
      badgeTimeoutRef.current = setTimeout(
        () => setBadge(null),
        autoClearMs,
      )
    }
  }

  const clearBadge = () => {
    if (badgeTimeoutRef.current) clearTimeout(badgeTimeoutRef.current)
    setBadge(null)
  }

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
        textareaRef.current.selectionStart =
          textareaRef.current.selectionEnd = start + text.length
        textareaRef.current.focus()
      }
    }, 0)
  }

  const uploadFile = async (file: File) => {
    if (isUploading) return

    const classification = classifyFile(file.type)
    if (!classification) {
      showBadge("FILE TYPE NOT ALLOWED_", "error", 4000)
      return
    }

    if (file.size > classification.maxBytes) {
      const maxMB = Math.round(
        classification.maxBytes / (1024 * 1024),
      )
      showBadge(`FILE TOO LARGE_ (max ${maxMB}MB)`, "error", 4000)
      return
    }

    setIsUploading(true)

    const uploadId = crypto.randomUUID()
    const placeholder = `<!-- UPLOAD_PENDING_${uploadId} -->`
    insertTextAtCursor(placeholder + "\n")

    try {
      let resultUrl: string
      let resultFilename: string
      let resultMimeType: string
      let resultFileSize: number

      if (isImageMime(file.type)) {
        setIsCompressing(true)
        showBadge("COMPRESSING_IMAGE...", "progress")

        const compressed = await compressImageForUpload(file)
        setIsCompressing(false)

        if (compressed.error) {
          showBadge(
            `UPLOAD FAILED_ ${compressed.error}`,
            "error",
            5000,
          )
          setContent((prev) => prev.replace(placeholder + "\n", ""))
          setIsUploading(false)
          return
        }

        showBadge("UPLOADING_IMAGE...", "progress")

        const formData = new FormData()
        formData.append("file", compressed.file)

        const res = await fetch("/api/upload/feature", {
          method: "POST",
          body: formData,
        })

        if (res.status === 413) {
          throw new Error("Image too large to upload.")
        }

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Upload failed")

        resultUrl = data.url
        resultFilename = data.filename
        resultMimeType = data.mimeType
        resultFileSize = data.fileSize
      } else if (file.size < VERCEL_BODY_LIMIT_BYTES) {
        showBadge("UPLOADING_FILE...", "progress")

        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch("/api/upload/feature", {
          method: "POST",
          body: formData,
        })

        if (res.status === 413) {
          throw new Error("File too large for direct upload.")
        }

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Upload failed")

        resultUrl = data.url
        resultFilename = data.filename
        resultMimeType = data.mimeType
        resultFileSize = data.fileSize
      } else {
        showBadge("UPLOADING_ 0%", "progress")

        const blobResult = await upload(
          sanitizeFilename(file.name, file.type),
          file,
          {
            access: "public",
            handleUploadUrl: "/api/upload/feature/token",
            clientPayload: JSON.stringify({
              mimeType: file.type,
              originalSize: file.size,
            }),
            onUploadProgress: ({ percentage }) => {
              showBadge(
                `UPLOADING_ ${Math.round(percentage)}%`,
                "progress",
              )
            },
          },
        )

        showBadge("COMMITTING_TO_GITHUB...", "progress")

        const commitRes = await fetch("/api/upload/feature/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blobUrl: blobResult.url,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
          }),
        })

        const commitData = await commitRes.json()
        if (!commitRes.ok)
          throw new Error(commitData.error || "Commit failed")

        resultUrl = commitData.url
        resultFilename = commitData.filename
        resultMimeType = commitData.mimeType
        resultFileSize = commitData.fileSize
      }

      const markdownBlock = generateMarkdownBlock(
        resultFilename,
        resultUrl,
        resultMimeType,
        resultFileSize,
      )
      setContent((prev) => prev.replace(placeholder, markdownBlock))
      clearBadge()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload error"
      showBadge(`UPLOAD FAILED_ ${message}`, "error", 5000)
      setContent((prev) => prev.replace(placeholder + "\n", ""))
      console.error("File upload error:", error)
    } finally {
      setIsUploading(false)
      setIsCompressing(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (isReadOnly || isUploading) return
    const items = e.clipboardData.items
    for (const item of Array.from(items)) {
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          uploadFile(file)
        }
        break
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    if (isReadOnly || isUploading) return
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      uploadFile(file)
    }
  }

  const insertSyntax = (prefix: string, suffix: string = "") => {
    if (isReadOnly || !textareaRef.current) return
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const selectedText = content.substring(start, end)
    const newText = prefix + selectedText + suffix

    setContent(
      content.substring(0, start) + newText + content.substring(end),
    )

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
        JSON.stringify({ title, content, tags: tagArray }),
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
      alert("Feature updated!")
    } catch (error: unknown) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Save Failed")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="border-tech-main group relative flex w-full flex-col space-y-6 border bg-white/80 p-4 backdrop-blur-sm sm:p-6">
      <div className="border-tech-main/40 pointer-events-none absolute top-0 left-0 h-2 w-2 -translate-x-[1px] -translate-y-[1px] border-t-2 border-l-2"></div>
      <div className="border-tech-main/40 pointer-events-none absolute top-0 right-0 h-2 w-2 translate-x-[1px] -translate-y-[1px] border-t-2 border-r-2"></div>
      <div className="border-tech-main/40 pointer-events-none absolute bottom-0 left-0 h-2 w-2 -translate-x-[1px] translate-y-[1px] border-b-2 border-l-2"></div>
      <div className="border-tech-main/40 pointer-events-none absolute right-0 bottom-0 h-2 w-2 translate-x-[1px] translate-y-[1px] border-r-2 border-b-2"></div>

      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="section-label">TITLE_</label>
          <BrutalInput
            required
            placeholder="ENTER TITLE..."
            className={`border-tech-main/40 focus:border-tech-main/60 py-3 font-mono text-lg backdrop-blur-sm ${isReadOnly ? "cursor-not-allowed bg-gray-100 opacity-70" : "bg-white/80"}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={isReadOnly}
            aria-busy={isSaving}
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label className="section-label">
            TAGS_ (comma separated)
          </label>
          <BrutalInput
            placeholder="e.g. bug, enhancement, UI"
            className={`border-tech-main/40 focus:border-tech-main/60 py-2 font-mono text-sm backdrop-blur-sm ${isReadOnly ? "cursor-not-allowed bg-gray-100 opacity-70" : "bg-white/80"}`}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            readOnly={isReadOnly}
            aria-busy={isSaving}
          />
        </div>
      </div>

      <div className="border-tech-main/40 relative flex min-h-125 grow flex-col border bg-white/80 backdrop-blur-sm">
        {/* Tab strip */}
        <div
          role="tablist"
          aria-label="Editor mode"
          className="bg-tech-main/10 border-tech-main/40 flex items-center border-b font-mono text-xs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "write"}
            aria-controls="editor-write-panel"
            onClick={() => setActiveTab("write")}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                setActiveTab("preview")
              }
            }}
            className={`px-4 py-2 transition-colors select-none ${activeTab === "write" ? "bg-tech-main text-white" : "text-tech-main/60 hover:bg-tech-main/10 cursor-pointer"}`}>
            WRITE_
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "preview"}
            aria-controls="editor-preview-panel"
            onClick={() => setActiveTab("preview")}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                setActiveTab("write")
              }
            }}
            className={`px-4 py-2 transition-colors select-none ${activeTab === "preview" ? "bg-tech-main text-white" : "text-tech-main/60 hover:bg-tech-main/10 cursor-pointer"}`}>
            PREVIEW_
          </button>
        </div>

        {activeTab === "write" && (
          <div className="bg-tech-main border-tech-main/40 sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b p-2 px-2 font-mono text-xs text-white/90 sm:gap-2 sm:px-4">
            <button
              type="button"
              onClick={() => insertSyntax("**", "**")}
              disabled={isReadOnly}
              className={`hover:bg-tech-accent/20 h-11 min-w-[44px] flex-1 border border-transparent px-3 transition-colors select-none hover:border-white/20 sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5 ${isReadOnly ? "" : "cursor-pointer"}`}>
              <b>B</b>
            </button>
            <button
              type="button"
              onClick={() => insertSyntax("*", "*")}
              disabled={isReadOnly}
              className={`hover:bg-tech-accent/20 h-11 min-w-[44px] flex-1 border border-transparent px-3 transition-colors select-none hover:border-white/20 sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5 ${isReadOnly ? "" : "cursor-pointer"}`}>
              <i>I</i>
            </button>
            <button
              type="button"
              onClick={() => insertSyntax("[", "](url)")}
              disabled={isReadOnly}
              className={`hover:bg-tech-accent/20 h-11 min-w-[44px] flex-1 border border-transparent px-3 transition-colors select-none hover:border-white/20 sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5 ${isReadOnly ? "" : "cursor-pointer"}`}>
              Link
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadOnly || isUploading}
              className={`hover:bg-tech-accent/20 h-11 min-w-[44px] flex-1 border border-transparent px-3 transition-colors select-none hover:border-white/20 sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5 ${isReadOnly || isUploading ? "" : "cursor-pointer"}`}
              aria-busy={isUploading}>
              {isCompressing ? "CMP" : isUploading ? "UPL" : "FILES"}
            </button>
            <div className="mx-1 hidden h-4 w-px bg-white/30 sm:block"></div>
            <button
              type="button"
              onClick={() => insertSyntax("### ")}
              disabled={isReadOnly}
              className={`hover:bg-tech-accent/20 hidden border border-transparent px-3 py-1.5 transition-colors select-none hover:border-white/20 sm:block ${isReadOnly ? "" : "cursor-pointer"}`}>
              H3
            </button>
            <button
              type="button"
              onClick={() => insertSyntax("`", "`")}
              disabled={isReadOnly}
              className={`hover:bg-tech-accent/20 hidden border border-transparent px-3 py-1.5 transition-colors select-none hover:border-white/20 sm:block ${isReadOnly ? "" : "cursor-pointer"}`}>
              Code
            </button>
            <button
              type="button"
              onClick={() => insertSyntax("```\n", "\n```")}
              disabled={isReadOnly}
              className={`hover:bg-tech-accent/20 hidden border border-transparent px-3 py-1.5 transition-colors select-none hover:border-white/20 sm:block ${isReadOnly ? "" : "cursor-pointer"}`}>
              Block
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,text/plain,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  uploadFile(file)
                  e.target.value = ""
                }
              }}
            />
            <span className="text-tech-accent/60 ml-auto hidden items-center gap-2 text-xs opacity-60 sm:flex">
              MARKDOWN_SUPPORTED_
            </span>
          </div>
        )}

        <div
          id="editor-write-panel"
          role="tabpanel"
          className="flex min-h-125 grow flex-col"
          hidden={activeTab !== "write"}>
          <div className="relative flex grow flex-col bg-white">
            <textarea
              ref={textareaRef}
              className={`w-full grow resize-none border-none p-6 font-mono text-sm leading-relaxed text-black placeholder-zinc-500 outline-none ${isReadOnly ? "cursor-not-allowed bg-gray-50" : "bg-transparent"}`}
              placeholder="ENTER FEATURE DESCRIPTION... (Use Markdown)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(e) => {
                if (!isReadOnly) e.preventDefault()
              }}
              onDragEnter={(e) => {
                if (!isReadOnly) e.preventDefault()
              }}
              readOnly={isReadOnly}
              aria-busy={isSaving}
            />

            {badge && (
              <div
                className={`absolute top-4 right-4 z-20 flex items-center gap-2 border px-3 py-1.5 font-mono text-xs shadow-sm backdrop-blur-sm ${
                  badge.type === "error"
                    ? "border-red-400 bg-red-900 text-red-200"
                    : "bg-tech-main text-tech-accent border-tech-accent shadow-tech-accent/20"
                }`}
                role="status"
                aria-live="polite">
                {badge.type === "progress" && (
                  <span className="bg-tech-accent inline-block h-2 w-2 animate-pulse" />
                )}
                {badge.type === "error" && (
                  <span className="inline-block h-2 w-2 bg-red-400" />
                )}
                {badge.message}
                {badge.type === "error" && (
                  <button
                    type="button"
                    onClick={clearBadge}
                    className="ml-2 text-red-300 hover:text-white"
                    aria-label="Dismiss">
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          id="editor-preview-panel"
          role="tabpanel"
          hidden={activeTab !== "preview"}
          className="flex min-h-125 grow flex-col">
          <MarkdownContent content={content} />
        </div>
      </div>

      {!isReadOnly && (
        <div className="border-tech-main/10 relative mt-6 flex justify-end gap-4 border-t pt-4">
          <div className="bg-tech-main absolute top-0 right-0 h-px w-8"></div>

          <BrutalButton
            type="button"
            variant="ghost"
            onClick={() => router.back()}>
            CANCEL_
          </BrutalButton>

          <BrutalButton
            type="submit"
            variant="primary"
            disabled={isSaving}
            aria-busy={isSaving && initialData?.id ? true : false}>
            {isSaving && initialData?.id ? (
              <LoadingIndicator
                label={PENDING_LABELS.SAVING_FEATURE}
              />
            ) : isSaving ? (
              "SAVING..."
            ) : (
              "SAVE_FEATURE_"
            )}
          </BrutalButton>
        </div>
      )}
    </form>
  )
}
