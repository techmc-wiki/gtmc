"use client";

import { useState, useTransition } from "react";
import { addFeatureComment } from "@/actions/feature";
import { BrutalButton } from "@/components/ui/brutal-button";
import { BrutalCard } from "@/components/ui/brutal-card";
import { LoadingIndicator, PENDING_LABELS } from "../loading-indicator";

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  emailRedacted?: boolean;
}

export function FeatureComments({
  featureId,
  initialComments,
  userId,
  isClosed,
}: {
  featureId: string;
  initialComments: Comment[];
  userId: string | undefined;
  isClosed?: boolean;
}) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    startTransition(async () => {
      await addFeatureComment(featureId, content);
      setContent("");
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="border-tech-main inline-block border-b-2 pb-2 text-2xl font-bold tracking-tighter uppercase">
        Discussions
      </h3>

      <div className="space-y-4">
        {initialComments.map((comment) => (
          <BrutalCard
            key={comment.id}
            className="border-tech-main/40 border bg-white/80 p-6 backdrop-blur-sm"
          >
            <div className="border-tech-main/30 mb-2 flex items-center gap-2 border-b border-dashed pb-2 font-mono text-sm">
              <span className="text-tech-main font-bold tracking-wider uppercase">
                {comment.author.name ||
                  (comment.emailRedacted ? "email redacted for privacy" : comment.author.email) ||
                  "Unknown"}
              </span>
              <span className="text-zinc-500" suppressHydrationWarning>
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="font-mono text-sm whitespace-pre-wrap">{comment.content}</div>
          </BrutalCard>
        ))}
        {initialComments.length === 0 && (
          <div className="text-tech-main/50 border-tech-main/40 border border-dashed bg-white/40 py-8 text-center font-mono">
            NO_COMMENTS_YET_
          </div>
        )}
      </div>

      {!isClosed &&
        (userId ? (
          <form onSubmit={handleSubmit} className="mt-8">
            <BrutalCard className="border-tech-main/40 border bg-white/80 p-6 backdrop-blur-sm">
              <label className="text-tech-main border-tech-main/40 mb-4 inline-block border-b pb-1 font-mono text-sm tracking-[0.2em] uppercase">
                LEAVE_A_REPLY_
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="border-tech-main/40 focus:border-tech-main/60 min-h-25 w-full resize-y border bg-white/80 p-4 font-mono text-sm text-black placeholder-zinc-500 backdrop-blur-sm focus:ring-0 focus:outline-none"
                placeholder="ENTER COMMENT..."
                disabled={isPending}
              />
              <div className="mt-4 flex justify-end">
                <BrutalButton
                  type="submit"
                  disabled={isPending || !content.trim()}
                  variant="primary"
                  aria-busy={isPending}
                >
                  {isPending ? (
                    <LoadingIndicator label={PENDING_LABELS.POSTING_COMMENT} />
                  ) : (
                    "POST_COMMENT"
                  )}
                </BrutalButton>
              </div>
            </BrutalCard>
          </form>
        ) : (
          <div className="border-tech-main/40 text-tech-main/70 mt-8 border bg-white/40 py-4 text-center font-mono text-sm">
            PLEASE_LOG_IN_TO_LEAVE_A_REPLY_
          </div>
        ))}
    </div>
  );
}
