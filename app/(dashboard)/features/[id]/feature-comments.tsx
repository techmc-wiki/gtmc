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
    <div className="mt-8 space-y-6">
      <h3 className="text-2xl font-bold tracking-tighter uppercase border-b-2 border-tech-main pb-2 inline-block">
        Discussions
      </h3>

      <div className="space-y-4">
        {initialComments.map((comment) => (
          <BrutalCard
            key={comment.id}
            className="p-4 bg-white/60 backdrop-blur-sm border-tech-main/30 border"
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-dashed border-tech-main/30 text-sm font-mono">
              <span className="font-bold text-tech-main uppercase tracking-wider">
                {comment.author.name ||
                  (comment.emailRedacted ? "email redacted for privacy" : comment.author.email) ||
                  "Unknown"}
              </span>
              <span className="text-zinc-500" suppressHydrationWarning>
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="whitespace-pre-wrap font-mono text-sm">{comment.content}</div>
          </BrutalCard>
        ))}
        {initialComments.length === 0 && (
          <div className="text-center py-8 text-tech-main/50 font-mono border border-dashed border-tech-main/30 bg-white/20">
            NO_COMMENTS_YET_
          </div>
        )}
      </div>

      {!isClosed &&
        (userId ? (
          <form onSubmit={handleSubmit} className="mt-8">
            <BrutalCard className="p-4 bg-white/60 backdrop-blur-sm border-tech-main/30 border">
              <label className="text-sm font-mono uppercase tracking-[0.2em] text-tech-main border-b border-tech-main/30 inline-block pb-1 mb-4">
                LEAVE_A_REPLY_
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[100px] p-3 border border-tech-main/40 text-black placeholder-zinc-500 focus:border-tech-main bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-0 font-mono text-sm resize-y"
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
          <div className="text-center py-4 bg-white/20 border border-tech-main/30 font-mono text-sm mt-8 text-tech-main/70">
            PLEASE_LOG_IN_TO_LEAVE_A_REPLY_
          </div>
        ))}
    </div>
  );
}
