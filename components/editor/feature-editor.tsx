"use client";

import * as React from "react";
import { BrutalButton } from "../ui/brutal-button";
import { BrutalInput } from "../ui/brutal-input";
import { useRouter } from "next/navigation";
import { updateFeature } from "@/actions/feature";

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

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const isReadOnly = false; // Everyone can edit their own or admins can edit. Handled server-side usually, but we keep it simple here.

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

    setIsUploading(true);
    const placeholder = `![Uploading ${file.name}...]()\n`;
    insertTextAtCursor(placeholder);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filePath", "features/images"); // Generic path for feature images

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error("HTTP " + res.status + " : " + (await res.text()));
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
      setContent((prev) =>
        prev.replace(placeholder, `<!-- Upload error -->\n`),
      );
      console.error(error);
    } finally {
      setIsUploading(false);
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
      className="flex flex-col space-y-6 w-full max-w-5xl mx-auto p-6 md:p-10 border border-tech-main/30 bg-white/60 backdrop-blur-md relative group"
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tech-main -translate-x-0.5 -translate-y-0.5"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-tech-main translate-x-0.5 translate-y-0.5"></div>

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
            TAGS_ (comma separated)
          </label>
          <BrutalInput
            placeholder="e.g. bug, enhancement, UI"
            className={`text-sm py-2 font-mono border-tech-main/40 focus:border-tech-main backdrop-blur-sm ${isReadOnly ? "bg-gray-100 cursor-not-allowed opacity-70" : "bg-white/50"}`}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            readOnly={isReadOnly}
          />
        </div>
      </div>

      <div className="flex flex-col grow min-h-125 border border-tech-main/30 bg-white/40 backdrop-blur-sm relative">
        {/* 工具栏 */}
        <div className="bg-tech-main text-white/90 p-2 flex flex-wrap gap-2 items-center sticky top-0 z-10 font-mono text-xs border-b border-tech-dark px-4">
          <button
            type="button"
            onClick={() => insertSyntax("**", "**")}
            disabled={isReadOnly}
            className="hover:bg-tech-accent/20 px-3 py-1.5 transition-colors border border-transparent hover:border-white/20 select-none"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("*", "*")}
            disabled={isReadOnly}
            className="hover:bg-tech-accent/20 px-3 py-1.5 transition-colors border border-transparent hover:border-white/20 select-none"
          >
            <i>I</i>
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("### ")}
            disabled={isReadOnly}
            className="hover:bg-tech-accent/20 px-3 py-1.5 transition-colors border border-transparent hover:border-white/20 select-none"
          >
            H3
          </button>
          <div className="w-px h-4 bg-white/30 mx-1"></div>
          <button
            type="button"
            onClick={() => insertSyntax("[", "](url)")}
            disabled={isReadOnly}
            className="hover:bg-tech-accent/20 px-3 py-1.5 transition-colors border border-transparent hover:border-white/20 select-none"
          >
            Link
          </button>
          <div className="w-px h-4 bg-white/30 mx-1"></div>
          <button
            type="button"
            onClick={() => insertSyntax("`", "`")}
            disabled={isReadOnly}
            className="hover:bg-tech-accent/20 px-3 py-1.5 transition-colors border border-transparent hover:border-white/20 select-none"
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("```\n", "\n```")}
            disabled={isReadOnly}
            className="hover:bg-tech-accent/20 px-3 py-1.5 transition-colors border border-transparent hover:border-white/20 select-none"
          >
            Block
          </button>
          <span className="ml-auto text-tech-accent/60 opacity-60 flex items-center gap-2 text-xs">
            MARKDOWN_SUPPORTED_
          </span>
        </div>

        {/* 編輯區 */}
        <div className="relative grow flex flex-col bg-white">
          <textarea
            ref={textareaRef}
            className={`w-full grow p-6 font-mono text-sm leading-relaxed text-black placeholder-zinc-500 border-none outline-none resize-none ${isReadOnly ? "bg-gray-50 cursor-not-allowed" : "bg-transparent"}`}
            placeholder="ENTER FEATURE DESCRIPTION... (Use Markdown)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            onDrop={handleDrop}
            readOnly={isReadOnly}
          />

          {isUploading && (
            <div className="absolute top-4 right-4 bg-tech-main text-tech-accent text-xs font-mono px-3 py-1.5 border border-tech-accent shadow-sm shadow-tech-accent/20 z-20 flex items-center gap-2 backdrop-blur-sm">
              <span className="inline-block w-2 h-2 bg-tech-accent animate-pulse"></span>
              UPLOADING_IMAGE...
            </div>
          )}
        </div>
      </div>

      {!isReadOnly && (
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-tech-main/10 relative">
          <div className="absolute top-0 right-0 w-8 h-px bg-tech-main"></div>

          <BrutalButton
            type="button"
            variant="ghost"
            onClick={() => router.back()}
          >
            CANCEL_
          </BrutalButton>

          <BrutalButton type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "SAVING..." : "SAVE_FEATURE_"}
          </BrutalButton>
        </div>
      )}
    </form>
  );
}
