"use client";

import * as React from "react";
import { BrutalButton } from "../ui/brutal-button";
import { BrutalInput } from "../ui/brutal-input";
import { saveDraftAction, submitForReviewAction } from "@/actions/article";
import { useRouter } from "next/navigation";
import { compressImageForUpload } from "@/lib/image-compression";

interface BrutalEditorProps {
  initialData?: {
    id?: string;
    articleId?: string;
    filePath?: string;
    title: string;
    content: string;
    status?: string;
  };
}

export function BrutalEditor({ initialData }: BrutalEditorProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initialData?.title || "");
  const [content, setContent] = React.useState(initialData?.content || "");
  const [filePath, setFilePath] = React.useState(initialData?.filePath || "");
  const [revisionId, setRevisionId] = React.useState<string | undefined>(initialData?.id);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isCompressing, setIsCompressing] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isReadOnly = initialData?.status === "SUBMITTED";

  const insertTextAtCursor = (text: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newContent = content.substring(0, start) + text + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + text.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Only images are allowed");
      return;
    }
    if (!filePath) {
      alert("Please specify a FILE_PATH first before uploading images!");
      return;
    }

    setIsUploading(true);
    setIsCompressing(true);
    const placeholder = `![Uploading ${file.name}...]()\n`;
    insertTextAtCursor(placeholder);

    try {
      const result = await compressImageForUpload(file);
      setIsCompressing(false);

      if (result.error) {
        setContent((prev) =>
          prev.replace(placeholder, `<!-- Upload failed: ${result.error} -->\n`),
        );
        alert(result.error);
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", result.file);
      formData.append("filePath", filePath);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.status === 413) {
        throw new Error("Image is too large to upload. Please use a smaller image.");
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`HTTP ${res.status}`);
      }

      if (res.ok && data.url) {
        setContent((prev) => prev.replace(placeholder, `![${file.name}](${data.url})\n`));
      } else {
        setContent((prev) => prev.replace(placeholder, `<!-- Upload failed: ${data.error} -->\n`));
        alert(data.error || "Upload failed");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload error";
      setContent((prev) => prev.replace(placeholder, `<!-- Upload failed: ${message} -->\n`));
      alert(message);
      console.error(error);
    } finally {
      setIsUploading(false);
      setIsCompressing(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (isReadOnly) return;
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          uploadImage(file);
        }
        break;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        uploadImage(file);
      }
    }
  };

  const insertSyntax = (prefix: string, suffix: string = "") => {
    if (isReadOnly || !textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = prefix + selectedText + suffix;

    setContent(content.substring(0, start) + newText + content.substring(end));

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = start + prefix.length;
        textareaRef.current.selectionEnd = start + prefix.length + selectedText.length;
      }
    }, 0);
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("filePath", filePath);
      if (revisionId) formData.append("revisionId", revisionId);
      if (initialData?.articleId) formData.append("articleId", initialData.articleId);

      const result = await saveDraftAction(formData);
      if (result.success && result.revisionId) {
        setRevisionId(result.revisionId);
        alert("草稿已保存 / Draft Saved!");
      }
    } catch (error) {
      console.error(error);
      alert("保存失败 / Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!revisionId) {
      alert("请先保存草稿 / Please save draft first");
      return;
    }

    try {
      await submitForReviewAction(revisionId);
      alert("已提交审核 / Submitted for Review!");
      router.push("/draft");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form
      onSubmit={handleSaveDraft}
      className="border-tech-main/40 group relative mx-auto flex w-full max-w-5xl flex-col space-y-6 border bg-white/80 p-6 backdrop-blur-sm sm:p-8"
    >
      <div className="border-tech-main/60 absolute top-0 left-0 h-2 w-2 -translate-x-0.5 -translate-y-0.5 border-t-2 border-l-2"></div>
      <div className="border-tech-main/60 absolute right-0 bottom-0 h-2 w-2 translate-x-0.5 translate-y-0.5 border-r-2 border-b-2"></div>

      {/* 标题区 */}
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
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label className="section-label">FILE_PATH (e.g. Folder/My-Article.md)_</label>
          <BrutalInput
            placeholder="e.g. SlimeTech/Molforte/04-新机器.md"
            className={`border-tech-main/40 focus:border-tech-main/60 py-2 font-mono text-sm backdrop-blur-sm ${isReadOnly ? "cursor-not-allowed bg-gray-100 opacity-70" : "bg-white/80"}`}
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            readOnly={isReadOnly}
          />
        </div>
      </div>

      {/* 编辑器主区域 (双栏布局或单栏) */}
      <div className="flex grow flex-col space-y-2">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-0">
          <label className="text-tech-main border-tech-main/30 tracking-tech-wide inline-block border-b pb-1 font-mono text-sm uppercase">
            CONTENT (MARKDOWN)_
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!isReadOnly && (
              <>
                <div className="sm:border-tech-main/30 flex flex-wrap gap-1 sm:mr-1 sm:gap-1 sm:border-r sm:pr-2">
                  <button
                    type="button"
                    onClick={() => insertSyntax("**", "**")}
                    className="text-tech-main/70 hover:bg-tech-main h-11 min-w-[44px] flex-1 cursor-pointer px-3 text-xs font-bold transition-colors hover:text-white sm:h-auto sm:min-w-0 sm:flex-none sm:px-2 sm:py-0 sm:text-xs"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSyntax("*", "*")}
                    className="text-tech-main/70 hover:bg-tech-main h-11 min-w-[44px] flex-1 cursor-pointer px-3 text-xs italic transition-colors hover:text-white sm:h-auto sm:min-w-0 sm:flex-none sm:px-2 sm:py-0 sm:text-xs"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSyntax("[", "](url)")}
                    className="text-tech-main/70 hover:bg-tech-main h-11 min-w-[44px] flex-1 cursor-pointer px-3 text-xs transition-colors hover:text-white sm:h-auto sm:min-w-0 sm:flex-none sm:px-2 sm:py-0 sm:text-xs"
                  >
                    LINK
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={`text-tech-main bg-tech-main/10 hover:bg-tech-main border-tech-main/30 h-11 min-w-[44px] flex-1 border px-3 font-mono text-[10px] tracking-widest transition-colors hover:text-white sm:h-auto sm:min-w-0 sm:flex-none sm:px-2 sm:py-0 sm:text-[10px] ${isUploading ? "" : "cursor-pointer"}`}
                  >
                    {isCompressing ? "CMP" : isUploading ? "UPL" : "IMG"}
                  </button>
                </div>
                <div className="border-tech-main/30 mr-1 hidden items-center gap-1 border-r pr-2 sm:flex">
                  <button
                    type="button"
                    onClick={() => insertSyntax("### ")}
                    className="hover:bg-tech-main text-tech-main/70 cursor-pointer px-2 text-xs transition-colors hover:text-white"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSyntax("`", "`")}
                    className="hover:bg-tech-main text-tech-main/70 cursor-pointer px-2 font-mono text-xs transition-colors hover:text-white"
                  >
                    &lt;/&gt;
                  </button>
                </div>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <span className="text-tech-main bg-tech-main/5 border-tech-main/30 hidden border px-2 py-1 font-mono text-[10px] tracking-widest sm:inline-block">
              {isReadOnly ? "READ_ONLY" : "SUPPORT_PASTE/DROP_IMG"}
            </span>
          </div>
        </div>

        <textarea
          required
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(e) => {
            if (!isReadOnly) e.preventDefault();
          }}
          onDragEnter={(e) => {
            if (!isReadOnly) e.preventDefault();
          }}
          className={`border-tech-main/40 focus:border-tech-main/60 text-tech-main-dark min-h-125 w-full resize-y border p-6 font-mono text-sm leading-relaxed backdrop-blur-sm transition-colors focus:outline-none ${isReadOnly ? "cursor-not-allowed bg-gray-100 opacity-70" : "bg-white/80"}`}
          placeholder="Write your markdown here... Use syntax logic. Drag&Drop or Paste images directly here."
          readOnly={isReadOnly}
        />
      </div>

      {/* 操作区 */}
      {!isReadOnly && (
        <div className="border-tech-main/40 flex flex-col gap-4 border-t pt-6 sm:flex-row">
          <BrutalButton
            type="submit"
            disabled={isSaving}
            variant="primary"
            className="w-full rounded-none sm:w-1/2"
          >
            {isSaving ? "SAVING..." : "SAVE DRAFT"}
          </BrutalButton>
          <BrutalButton
            type="button"
            onClick={handleSubmitReview}
            disabled={!revisionId}
            variant="secondary"
            className="w-full rounded-none sm:w-1/2"
          >
            SUBMIT FOR REVIEW
          </BrutalButton>
        </div>
      )}
    </form>
  );
}
