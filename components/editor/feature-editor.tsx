"use client";

import * as React from "react";
import { BrutalButton } from "../ui/brutal-button";
import { BrutalInput } from "../ui/brutal-input";
import { useRouter } from "next/navigation";
import { updateFeature } from "@/actions/feature";
import { compressImageForUpload } from "@/lib/image-compression";
import { LoadingIndicator, PENDING_LABELS } from "@/app/(dashboard)/features/loading-indicator";

interface FeatureEditorProps {
  initialData?: {
    id?: string;
    title: string;
    content: string;
    tags?: string[];
    status?: string;
  };
}

export function FeatureEditor({ initialData }: FeatureEditorProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initialData?.title || "");
  const [content, setContent] = React.useState(initialData?.content || "");
  const [tags, setTags] = React.useState(initialData?.tags?.join(", ") || "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isCompressing, setIsCompressing] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isReadOnly = false; // Everyone can edit their own or admins can edit. Handled server-side usually, but we keep it simple here.

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

      const res = await fetch("/api/upload/feature", {
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!initialData?.id) {
      // Stage payload and redirect immediately — PendingCreationBanner handles the actual creation
      sessionStorage.setItem(
        "pendingFeatureCreate.v1",
        JSON.stringify({ title, content, tags: tagArray }),
      );
      router.push("/features?created=true");
      return;
    }

    // Update path
    setIsSaving(true);
    try {
      await updateFeature(initialData.id, { title, content, tags: tagArray });
      alert("Feature updated!");
    } catch (error: unknown) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="border-tech-main group relative flex w-full flex-col space-y-6 border bg-white/80 p-4 backdrop-blur-sm sm:p-6"
    >
      <div className="border-tech-main/40 pointer-events-none absolute top-0 left-0 h-2 w-2 -translate-x-[1px] -translate-y-[1px] border-t-2 border-l-2"></div>
      <div className="border-tech-main/40 pointer-events-none absolute top-0 right-0 h-2 w-2 translate-x-[1px] -translate-y-[1px] border-t-2 border-r-2"></div>
      <div className="border-tech-main/40 pointer-events-none absolute bottom-0 left-0 h-2 w-2 -translate-x-[1px] translate-y-[1px] border-b-2 border-l-2"></div>
      <div className="border-tech-main/40 pointer-events-none absolute right-0 bottom-0 h-2 w-2 translate-x-[1px] translate-y-[1px] border-r-2 border-b-2"></div>

      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="text-tech-main border-tech-main/30 mb-2 inline-block border-b pb-1 font-mono text-sm tracking-[0.2em] uppercase">
            TITLE_
          </label>
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
          <label className="text-tech-main border-tech-main/30 mb-2 inline-block border-b pb-1 font-mono text-sm tracking-[0.2em] uppercase">
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
        {/* 工具栏 */}
        <div className="bg-tech-main border-tech-main/40 sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b p-2 px-2 font-mono text-xs text-white/90 sm:gap-2 sm:px-4">
          <button
            type="button"
            onClick={() => insertSyntax("**", "**")}
            disabled={isReadOnly}
            className={`hover:bg-tech-accent/20 h-11 min-w-[44px] flex-1 border border-transparent px-3 transition-colors select-none hover:border-white/20 sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5 ${isReadOnly ? "" : "cursor-pointer"}`}
          >
            <b>B</b>
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("*", "*")}
            disabled={isReadOnly}
            className={`hover:bg-tech-accent/20 h-11 min-w-[44px] flex-1 border border-transparent px-3 transition-colors select-none hover:border-white/20 sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5 ${isReadOnly ? "" : "cursor-pointer"}`}
          >
            <i>I</i>
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("[", "](url)")}
            disabled={isReadOnly}
            className={`hover:bg-tech-accent/20 h-11 min-w-[44px] flex-1 border border-transparent px-3 transition-colors select-none hover:border-white/20 sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5 ${isReadOnly ? "" : "cursor-pointer"}`}
          >
            Link
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadOnly || isUploading}
            className={`hover:bg-tech-accent/20 h-11 min-w-[44px] flex-1 border border-transparent px-3 transition-colors select-none hover:border-white/20 sm:h-auto sm:min-w-0 sm:flex-none sm:py-1.5 ${isReadOnly || isUploading ? "" : "cursor-pointer"}`}
            aria-busy={isUploading}
          >
            {isCompressing ? "CMP" : isUploading ? "UPL" : "IMG"}
          </button>
          <div className="mx-1 hidden h-4 w-px bg-white/30 sm:block"></div>
          <button
            type="button"
            onClick={() => insertSyntax("### ")}
            disabled={isReadOnly}
            className={`hover:bg-tech-accent/20 hidden border border-transparent px-3 py-1.5 transition-colors select-none hover:border-white/20 sm:block ${isReadOnly ? "" : "cursor-pointer"}`}
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("`", "`")}
            disabled={isReadOnly}
            className={`hover:bg-tech-accent/20 hidden border border-transparent px-3 py-1.5 transition-colors select-none hover:border-white/20 sm:block ${isReadOnly ? "" : "cursor-pointer"}`}
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("```\n", "\n```")}
            disabled={isReadOnly}
            className={`hover:bg-tech-accent/20 hidden border border-transparent px-3 py-1.5 transition-colors select-none hover:border-white/20 sm:block ${isReadOnly ? "" : "cursor-pointer"}`}
          >
            Block
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                uploadImage(file);
                e.target.value = "";
              }
            }}
          />
          <span className="text-tech-accent/60 ml-auto hidden items-center gap-2 text-xs opacity-60 sm:flex">
            MARKDOWN_SUPPORTED_
          </span>
        </div>

        {/* 編輯區 */}
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
              if (!isReadOnly) e.preventDefault();
            }}
            onDragEnter={(e) => {
              if (!isReadOnly) e.preventDefault();
            }}
            readOnly={isReadOnly}
            aria-busy={isSaving}
          />

          {isUploading && (
            <div
              className="bg-tech-main text-tech-accent border-tech-accent shadow-tech-accent/20 absolute top-4 right-4 z-20 flex items-center gap-2 border px-3 py-1.5 font-mono text-xs shadow-sm backdrop-blur-sm"
              aria-live="polite"
              aria-label="Image upload status"
            >
              <span className="bg-tech-accent inline-block h-2 w-2 animate-pulse"></span>
              {isCompressing ? "COMPRESSING_IMAGE..." : "UPLOADING_IMAGE..."}
            </div>
          )}
        </div>
      </div>

      {!isReadOnly && (
        <div className="border-tech-main/10 relative mt-6 flex justify-end gap-4 border-t pt-4">
          <div className="bg-tech-main absolute top-0 right-0 h-px w-8"></div>

          <BrutalButton type="button" variant="ghost" onClick={() => router.back()}>
            CANCEL_
          </BrutalButton>

          <BrutalButton
            type="submit"
            variant="primary"
            disabled={isSaving}
            aria-busy={isSaving && initialData?.id ? true : false}
          >
            {isSaving && initialData?.id ? (
              <LoadingIndicator label={PENDING_LABELS.SAVING_FEATURE} />
            ) : isSaving ? (
              "SAVING..."
            ) : (
              "SAVE_FEATURE_"
            )}
          </BrutalButton>
        </div>
      )}
    </form>
  );
}
