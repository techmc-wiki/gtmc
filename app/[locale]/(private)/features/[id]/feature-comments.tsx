"use client"

import React, { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { addFeatureComment } from "@/actions/feature"
import { TechButton } from "@/components/ui/tech-button"
import { TechCard } from "@/components/ui/tech-card"
import { TextAreaBox } from "@/components/ui/textarea-box"
import { LoadingIndicator, PENDING_LABELS } from "../loading-indicator"

interface Comment {
  id: string
  content: string
  createdAt: Date
  author: {
    name: string | null
    email: string | null
    image: string | null
  }
  emailRedacted?: boolean
}

export function FeatureComments({
  featureId,
  initialComments,
  userId,
  isClosed,
}: {
  featureId: string
  initialComments: Comment[]
  userId: string | undefined
  isClosed?: boolean
}) {
  const t = useTranslations("Feature")
  const [content, setContent] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    startTransition(async () => {
      await addFeatureComment(featureId, content)
      setContent("")
    })
  }

  return (
    <div className="space-y-6">
      <h3
        className="
          inline-block border-b-2 border-tech-main pb-2 text-2xl font-bold
          tracking-tighter uppercase
        ">
        {t("discussionsHeading")}
      </h3>

      <div className="space-y-4">
        {initialComments.map((comment) => (
          <TechCard
            key={comment.id}
            className="
              border border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm
            ">
            <div
              className="
                mb-2 flex items-center gap-2 border-b border-dashed
                border-tech-main/30 pb-2 font-mono text-sm
              ">
              <span className="font-bold tracking-wider text-tech-main uppercase">
                {comment.author.name ||
                  (comment.emailRedacted
                    ? t("emailRedacted")
                    : comment.author.email) ||
                  t("unknownCommentAuthor")}
              </span>
              <span className="text-zinc-500" suppressHydrationWarning>
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="font-mono text-sm whitespace-pre-wrap">
              {comment.content}
            </div>
          </TechCard>
        ))}
        {initialComments.length === 0 && (
          <div
            className="
              border border-dashed border-tech-main/40 bg-white/40 py-8
              text-center font-mono text-tech-main/50
            ">
            {t("noCommentsYet")}
          </div>
        )}
      </div>

      {!isClosed &&
        (userId ? (
          <form onSubmit={handleSubmit} className="mt-8">
            <TechCard
              className="
                border border-tech-main/40 bg-white/80 p-6 backdrop-blur-sm
              ">
              <label
                className="
                  mb-4 inline-block border-b border-tech-main/40 pb-1 font-mono
                  text-sm tracking-tech-wide text-tech-main uppercase
                ">
                {t("leaveReplyLabel")}
              </label>
              <TextAreaBox
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("commentPlaceholder")}
                disabled={isPending}
              />
              <div className="mt-4 flex justify-end">
                <TechButton
                  type="submit"
                  disabled={isPending || !content.trim()}
                  variant="primary"
                  aria-busy={isPending}>
                  {isPending ? (
                    <LoadingIndicator label={PENDING_LABELS.POSTING_COMMENT} />
                  ) : (
                    t("postCommentButton")
                  )}
                </TechButton>
              </div>
            </TechCard>
          </form>
        ) : (
          <div
            className="
              mt-8 border border-tech-main/40 bg-white/40 py-4 text-center
              font-mono text-sm text-tech-main/70
            ">
            PLEASE_LOG_IN_TO_LEAVE_A_REPLY_
          </div>
        ))}
    </div>
  )
}
