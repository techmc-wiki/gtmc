"use client";

import { useState } from "react";

import { resolveConflictAction } from "@/actions/review";
import { BrutalButton } from "@/components/ui/brutal-button";

export default function ConflictResolver({
  filePath,
  initialContent,
  prNumber,
}: {
  filePath: string;
  initialContent: string;
  prNumber: number;
}) {
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleResolve(formData: FormData) {
    setIsSubmitting(true);
    try {
      await resolveConflictAction(prNumber, formData);
      window.location.reload();
    } catch (error) {
      alert(`Failed to resolve conflict: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-l-4 border-amber-500 bg-amber-500/10 p-4 text-amber-700">
        <p className="font-bold uppercase tracking-widest">Admin Resolution Required</p>
        <p className="text-sm">Edit the merged result below, then update the PR branch with the resolved content.</p>
      </div>

      <form action={handleResolve} className="space-y-4">
        <input type="hidden" name="filePath" value={filePath} />

        <div className="bg-tech-main/5 border-tech-main/30 relative border p-1 focus-within:border-tech-main">
          <textarea
            name="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="text-tech-main-dark min-h-[500px] w-full resize-y bg-transparent p-4 font-mono text-sm outline-none"
          />
        </div>

        <BrutalButton type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "RESOLVING..." : "RESOLVE & UPDATE PR"}
        </BrutalButton>
      </form>
    </div>
  );
}