"use client";

import * as React from "react";
import { BrutalButton } from "../ui/brutal-button";
import { BrutalInput } from "../ui/brutal-input";
import { saveDraftAction, submitForReviewAction } from "@/actions/article";
import { useRouter } from "next/navigation";

interface BrutalEditorProps {
  initialData?: {
    id?: string;
    articleId?: string;
    filePath?: string;
    title: string;
    content: string;
  };
}

export function BrutalEditor({ initialData }: BrutalEditorProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initialData?.title || "");
  const [content, setContent] = React.useState(initialData?.content || "");
  const [revisionId, setRevisionId] = React.useState<string | undefined>(initialData?.id);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      if (revisionId) formData.append("revisionId", revisionId);
      if (initialData?.articleId) formData.append("articleId", initialData.articleId);
      if (initialData?.filePath) formData.append("filePath", initialData.filePath);

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
    <form onSubmit={handleSaveDraft} className="flex flex-col space-y-6 w-full max-w-5xl mx-auto p-6 md:p-10 border border-tech-main/30 bg-white/60 backdrop-blur-md relative group">
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tech-main -translate-x-[2px] -translate-y-[2px]"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-tech-main translate-x-[2px] translate-y-[2px]"></div>
      
      {/* 标题区 */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-mono uppercase tracking-[0.2em] text-tech-main border-b border-tech-main/30 inline-block pb-1 mb-2">
          TITLE_
        </label>
        <BrutalInput 
          required
          placeholder="ENTER TITLE..." 
          className="text-lg py-3 font-mono border-tech-main/40 focus:border-tech-main bg-white/50 backdrop-blur-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* 编辑器主区域 (双栏布局或单栏) */}
      <div className="flex flex-col space-y-2 flex-grow">
        <div className="flex justify-between items-end mb-2">
          <label className="text-sm font-mono uppercase tracking-[0.2em] text-tech-main border-b border-tech-main/30 inline-block pb-1">
            CONTENT (MARKDOWN)_
          </label>
          <span className="text-[10px] font-mono tracking-widest text-tech-main bg-tech-main/5 px-2 py-1 border border-tech-main/30">
            TENCENT_COS_READY
          </span>
        </div>
        
        <textarea 
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[500px] border border-tech-main/30 p-4 font-mono text-sm leading-relaxed resize-y focus:outline-none focus:border-tech-main bg-white/50 text-tech-main-dark transition-colors backdrop-blur-sm shadow-inner"
          placeholder="Write your markdown here... Use syntax logic."
        />
      </div>

      {/* 操作区 */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-tech-main/30">
        <BrutalButton type="submit" disabled={isSaving} variant="primary" className="w-full sm:w-1/2 rounded-none">
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
    </form>
  );
}