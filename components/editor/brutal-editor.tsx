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
  const [revisionId, setRevisionId] = React.useState<string | undefined>(
    initialData?.id,
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isCompressing, setIsCompressing] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isReadOnly =
    initialData?.status === "PENDING" || initialData?.status === "APPROVED";

  const insertTextAtCursor = (text: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newContent =
      content.substring(0, start) + text + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
          start + text.length;
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
        setContent((prev) =>
          prev.replace(placeholder, `![${file.name}](${data.url})\n`),
        );
      } else {
        setContent((prev) =>
          prev.replace(placeholder, `<!-- Upload failed: ${data.error} -->\n`),
        );
        alert(data.error || "Upload failed");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload error";
      setContent((prev) =>
        prev.replace(placeholder, `<!-- Upload failed: ${message} -->\n`),
      );
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
        textareaRef.current.selectionEnd =
          start + prefix.length + selectedText.length;
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
      if (initialData?.articleId)
        formData.append("articleId", initialData.articleId);

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
      className="flex flex-col space-y-6 w-full max-w-5xl mx-auto p-6 md:p-10 border border-tech-main/30 bg-white/60 backdrop-blur-md relative group"
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tech-main -translate-x-0.5 -translate-y-0.5"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-tech-main translate-x-0.5 translate-y-0.5"></div>

      {/* 标题区 */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-mono uppercase tracking-[0.2em] text-tech-main border-b border-tech-main/30 inline-block pb-1 mb-2">
            TITLE_
          </label>
          <BrutalInput
            required
            placeholder="ENTER TITLE..."
            className={`text-lg py-3 font-mono border-tech-main/40 focus:border-tech-main backdrop-blur-sm ${isReadOnly ? "bg-gray-100 cursor-not-allowed opacity-70" : "bg-white/50"}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={isReadOnly}
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-sm font-mono uppercase tracking-[0.2em] text-tech-main border-b border-tech-main/30 inline-block pb-1 mb-2">
            FILE_PATH (e.g. Folder/My-Article.md)_
          </label>
          <BrutalInput
            placeholder="e.g. SlimeTech/Molforte/04-新机器.md"
            className={`text-sm py-2 font-mono border-tech-main/40 focus:border-tech-main backdrop-blur-sm ${isReadOnly ? "bg-gray-100 cursor-not-allowed opacity-70" : "bg-white/50"}`}
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            readOnly={isReadOnly}
          />
        </div>
      </div>

      {/* 编辑器主区域 (双栏布局或单栏) */}
      <div className="flex flex-col space-y-2 grow">
        <div className="flex justify-between items-end mb-2">
          <label className="text-sm font-mono uppercase tracking-[0.2em] text-tech-main border-b border-tech-main/30 inline-block pb-1">
            CONTENT (MARKDOWN)_
          </label>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <>
                <div className="flex items-center gap-1 border-r border-tech-main/30 pr-2 mr-1">
                  <button
                    type="button"
                    onClick={() => insertSyntax("**", "**")}
                    className="hover:bg-tech-main hover:text-white text-tech-main/70 px-2 text-xs font-bold transition-colors"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSyntax("*", "*")}
                    className="hover:bg-tech-main hover:text-white text-tech-main/70 px-2 text-xs italic transition-colors"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSyntax("### ")}
                    className="hover:bg-tech-main hover:text-white text-tech-main/70 px-2 text-xs transition-colors"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSyntax("`", "`")}
                    className="hover:bg-tech-main hover:text-white text-tech-main/70 px-2 text-xs font-mono transition-colors"
                  >
                    &lt;/&gt;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSyntax("[", "](url)")}
                    className="hover:bg-tech-main hover:text-white text-tech-main/70 px-2 text-xs transition-colors"
                  >
                    LINK
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-[10px] font-mono tracking-widest text-tech-main bg-tech-main/10 hover:bg-tech-main hover:text-white transition-colors px-2 py-1 border border-tech-main/30"
                >
                  {isCompressing ? "[ COMPRESSING... ]" : isUploading ? "[ UPLOADING... ]" : "[ UPLOAD_IMG ]"}
                </button>
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
            <span className="text-[10px] font-mono tracking-widest text-tech-main bg-tech-main/5 px-2 py-1 border border-tech-main/30 hidden sm:inline-block">
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
          className={`w-full min-h-125 border border-tech-main/30 p-4 font-mono text-sm leading-relaxed resize-y focus:outline-none focus:border-tech-main text-tech-main-dark transition-colors backdrop-blur-sm shadow-inner ${isReadOnly ? "bg-gray-100 cursor-not-allowed opacity-70" : "bg-white/50"}`}
          placeholder="Write your markdown here... Use syntax logic. Drag&Drop or Paste images directly here."
          readOnly={isReadOnly}
        />
      </div>

      {/* 操作区 */}
      {!isReadOnly && (
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-tech-main/30">
          <BrutalButton
            type="submit"
            disabled={isSaving}
            variant="primary"
            className="w-full sm:w-1/2 rounded-none"
          >
            {isSaving ? "SAVING..." : "SAVE DRAFT"}
          </BrutalButton>
          <BrutalButton
            type="button"
            onClick={handleSubmitReview}
            disabled={!revisionId}
            variant="secondary"
            className="w-full sm:w-1/2 rounded-none"
          >
            SUBMIT FOR REVIEW
          </BrutalButton>
        </div>
      )}
    </form>
  );
}
