"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"

import { saveDraftAction, submitForReviewAction } from "@/actions/article"
import { getMarkdownComponents, getPluginsForContent } from "@/lib/markdown"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import {
  LoadingIndicator,
  PENDING_LABELS,
} from "@/components/ui/loading-indicator"
import { BrutalButton } from "../ui/brutal-button"
import { BrutalInput } from "../ui/brutal-input"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import "katex/dist/katex.min.css"

interface DraftEditorProps {
  initialData?: {
    conflictContent?: string
    id?: string
    articleId?: string
    filePath?: string
    githubPrUrl?: string
    title: string
    content: string
    status?: string
  }
}

export function DraftEditor({ initialData }: DraftEditorProps) {
  const router = useRouter()
  const initialStatus = initialData?.status || "DRAFT"
  const initialEditorContent =
    initialStatus === "SYNC_CONFLICT"
      ? initialData?.conflictContent || initialData?.content || ""
      : initialData?.content || ""

  const [draftStatus, setDraftStatus] = React.useState(initialStatus)
  const [title, setTitle] = React.useState(initialData?.title || "")
  const [content, setContent] = React.useState(initialEditorContent)
  const [filePath, setFilePath] = React.useState(initialData?.filePath || "")
  const [revisionId, setRevisionId] = React.useState<string | undefined>(
    initialData?.id
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">("write")

  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const articleId = initialData?.articleId
  const githubPrUrl = initialData?.githubPrUrl
  const isSyncConflict = draftStatus === "SYNC_CONFLICT"
  const isReadOnly =
    draftStatus === "IN_REVIEW" || draftStatus === "SYNC_CONFLICT"

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

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("content", content)
      formData.append("filePath", filePath)
      if (revisionId) formData.append("revisionId", revisionId)
      if (articleId) formData.append("articleId", articleId)

      const result = await saveDraftAction(formData)
      if (result.success && result.revisionId) {
        setRevisionId(result.revisionId)
        alert("草稿已保存 / Draft Saved!")
      }
    } catch (error) {
      console.error(error)
      alert("保存失败 / Save Failed")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!revisionId) {
      alert("请先保存草稿 / Please save draft first")
      return
    }

    setIsSubmittingReview(true)
    try {
      const result = await submitForReviewAction(revisionId)
      setDraftStatus(result.status)
      alert(
        result.status === "SYNC_CONFLICT"
          ? "检测到与最新 main 的冲突，请继续解决 / Sync conflict detected. Please resolve it."
          : "已开启 PR 并进入审核 / PR opened successfully."
      )
      router.push(`/draft/${revisionId}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert("提交审核失败 / Submit Failed")
    } finally {
      setIsSubmittingReview(false)
    }
  }

  return (
    <form
      onSubmit={handleSaveDraft}
      className="
        group relative flex w-full flex-col space-y-6 border border-tech-main
        bg-white/80 p-4 backdrop-blur-sm
        sm:p-6
      ">
      <CornerBrackets />

      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="section-label">TITLE_</label>
          <BrutalInput
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
          <label className="section-label">FILE_PATH_</label>
          <BrutalInput
            placeholder="e.g. SlimeTech/Molforte/04-新机器.md"
            className={`
              border-tech-main/40 py-2 font-mono text-sm backdrop-blur-sm
              focus:border-tech-main/60
              ${
                isReadOnly
                  ? `cursor-not-allowed bg-gray-100 opacity-70`
                  : `bg-white/80`
              }
            `}
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            readOnly={isReadOnly}
            aria-busy={isSaving}
          />
        </div>
      </div>

      {githubPrUrl ? (
        <div
          className="
            flex items-center justify-between gap-3 border guide-line
            bg-tech-main/5 px-4 py-3 font-mono text-xs text-tech-main
          ">
          <span>PR_STREAM_ACTIVE</span>
          <a
            href={githubPrUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4">
            OPEN_GITHUB_PR
          </a>
        </div>
      ) : null}

      {isSyncConflict ? (
        <div
          className="
            border-l-4 border-amber-500 bg-amber-500/10 p-4 text-amber-700
          ">
          <p className="font-bold tracking-widest uppercase">
            Admin Resolution Pending
          </p>
          <p className="text-sm">
            This PR is blocked by a sync conflict. Only an admin can resolve it
            from the review page.
          </p>
        </div>
      ) : null}

      <div
        className="
          relative flex min-h-125 grow flex-col border border-tech-main/40
          bg-white/80 backdrop-blur-sm
        ">
        <div
          role="tablist"
          aria-label="Editor mode"
          className="
            flex items-center border-b border-tech-main/40 bg-tech-main/10
            font-mono text-xs
          ">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "write"}
            aria-controls="draft-editor-write-panel"
            onClick={() => setActiveTab("write")}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") setActiveTab("preview")
            }}
            className={`
              px-4 py-2 transition-colors select-none
              ${
                activeTab === "write"
                  ? `bg-tech-main text-white`
                  : `
                    cursor-pointer text-tech-main/60
                    hover:bg-tech-main/10
                  `
              }
            `}>
            WRITE_
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "preview"}
            aria-controls="draft-editor-preview-panel"
            onClick={() => setActiveTab("preview")}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setActiveTab("write")
            }}
            className={`
              px-4 py-2 transition-colors select-none
              ${
                activeTab === "preview"
                  ? `bg-tech-main text-white`
                  : `
                    cursor-pointer text-tech-main/60
                    hover:bg-tech-main/10
                  `
              }
            `}>
            PREVIEW_
          </button>
        </div>

        {activeTab === "write" && (
          <EditorToolbar onInsert={insertSyntax} disabled={isReadOnly} />
        )}

        <div
          id="draft-editor-write-panel"
          role="tabpanel"
          className="flex min-h-125 grow flex-col"
          hidden={activeTab !== "write"}>
          <div className="relative flex grow flex-col bg-white">
            <textarea
              ref={textareaRef}
              className={`
                w-full grow resize-none border-none p-6 font-mono
                text-sm/relaxed text-black placeholder-zinc-500 outline-none
                ${
                  isReadOnly
                    ? `cursor-not-allowed bg-gray-50`
                    : `bg-transparent`
                }
              `}
              placeholder="ENTER CONTENT... (Use Markdown)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              readOnly={isReadOnly}
              aria-busy={isSaving}
            />
          </div>
        </div>

        <div
          id="draft-editor-preview-panel"
          role="tabpanel"
          hidden={activeTab !== "preview"}
          className="flex min-h-125 grow flex-col">
          {content?.trim() ? (
            <div
              className="
                w-full max-w-none overflow-hidden p-6 wrap-break-word
                selection:bg-tech-main/20 selection:text-slate-900
                sm:p-8
              ">
              <ReactMarkdown
                remarkPlugins={getPluginsForContent(content).remarkPlugins}
                rehypePlugins={getPluginsForContent(content).rehypePlugins}
                components={getMarkdownComponents("")}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="p-6 font-mono text-xs text-tech-main/40">
              NOTHING_TO_PREVIEW_
            </p>
          )}
        </div>
      </div>

      {!isReadOnly && (
        <div
          className="
            relative mt-6 flex justify-end gap-4 border-t border-tech-main/10
            pt-4
          ">
          <div className="absolute top-0 right-0 h-px w-8 bg-tech-main" />

          <BrutalButton
            type="submit"
            variant="primary"
            disabled={isSaving}
            aria-busy={isSaving}>
            {isSaving ? (
              <LoadingIndicator label={PENDING_LABELS.SAVING_DRAFT} />
            ) : (
              "SAVE DRAFT"
            )}
          </BrutalButton>

          <BrutalButton
            type="button"
            variant="ghost"
            onClick={handleSubmitReview}
            disabled={isSubmittingReview || isSaving}
            aria-busy={isSubmittingReview}>
            {isSubmittingReview ? (
              <LoadingIndicator label={PENDING_LABELS.SUBMITTING_REVIEW} />
            ) : (
              "OPEN PR & SYNC MAIN"
            )}
          </BrutalButton>
        </div>
      )}
    </form>
  )
}
