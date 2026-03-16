"use client";

import { useState } from "react";
import { resolveConflictAction } from "@/actions/review";
import { BrutalButton } from "@/components/ui/brutal-button";

export default function ConflictResolver({
  prNumber,
  filePath,
  initialContent,
}: {
  prNumber: number;
  filePath: string;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleResolve(formData: FormData) {
    setIsSubmitting(true);
    try {
      await resolveConflictAction(prNumber, formData);
      window.location.reload();
    } catch (err) {
      alert("Failed to resolve conflict: " + err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-l-4 border-red-500 bg-red-500/10 p-4 text-red-700">
        <p className="font-bold uppercase tracking-widest">Merge Conflict Detected!</p>
        <p className="text-sm">Please resolve the conflicts in the editor below and submit.</p>
      </div>

      <form action={handleResolve} className="space-y-4">
        <input type="hidden" name="filePath" value={filePath} />
        
        <div className="bg-tech-main/5 border-tech-main/30 relative border p-1 focus-within:border-tech-main">
          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="text-tech-main-dark min-h-[500px] w-full resize-y bg-transparent p-4 font-mono text-sm outline-none"
          />
        </div>

        <BrutalButton type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "RESOLVING..." : "OVERWRITE & RESOLVE"}
        </BrutalButton>
      </form>
    </div>
  );
}