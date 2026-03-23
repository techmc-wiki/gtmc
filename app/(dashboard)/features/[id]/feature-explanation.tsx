"use client"

import { useState, useTransition } from "react"
import { BrutalCard } from "@/components/ui/brutal-card"
import { BrutalButton } from "@/components/ui/brutal-button"
import { updateFeatureExplanation } from "@/actions/feature"
import { LoadingIndicator, PENDING_LABELS } from "../loading-indicator"

interface FeatureExplanationProps {
  featureId: string
  initialExplanation: string | null
  isAssignee: boolean
  isAdmin: boolean
  isClosed?: boolean
}

export function FeatureExplanation({
  featureId,
  initialExplanation,
  isAssignee,
  isAdmin,
  isClosed,
}: FeatureExplanationProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [explanation, setExplanation] = useState(initialExplanation || "")
  const [isPending, startTransition] = useTransition()

  const canEdit = isAssignee || isAdmin
  const effectiveCanEdit = canEdit && !isClosed

  const handleSave = () => {
    startTransition(async () => {
      await updateFeatureExplanation(featureId, explanation)
      setIsEditing(false)
    })
  }

  if (!initialExplanation && !effectiveCanEdit) return null

  if (isEditing) {
    return (
      <BrutalCard className="border-tech-accent/40 bg-white/80 backdrop-blur-sm">
        <h3
          className="
            mb-2 border-b border-tech-accent/40 pb-2 text-lg font-bold
            tracking-widest text-tech-main uppercase
          ">
          EDIT_RESOLUTION_EXPLANATION_
        </h3>
        <textarea
          className="
            mb-4 min-h-30 w-full resize-y border border-tech-accent/40
            bg-white/80 p-4 font-mono text-sm text-black placeholder-zinc-500
            backdrop-blur-sm
            focus:border-tech-accent/60 focus:ring-0 focus:outline-none
          "
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="PROVIDE OFFICIAL EXPLANATION / RESOLUTION..."
          disabled={isPending}
          aria-busy={isPending}
        />
        <div className="flex justify-end gap-2">
          <BrutalButton
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
            disabled={isPending}>
            CANCEL
          </BrutalButton>
          <BrutalButton
            variant="primary"
            size="sm"
            className="
              border-tech-accent bg-tech-accent text-white
              hover:bg-tech-accent/90
            "
            onClick={handleSave}
            disabled={isPending}
            aria-busy={isPending}>
            {isPending ? (
              <LoadingIndicator label={PENDING_LABELS.SAVING_EXPLANATION} />
            ) : (
              "SAVE_EXPLANATION"
            )}
          </BrutalButton>
        </div>
      </BrutalCard>
    )
  }

  if (initialExplanation) {
    return (
      <BrutalCard
        className="
          group relative overflow-hidden border-tech-accent/40 bg-tech-accent/5
          backdrop-blur-sm
        ">
        <div className="absolute top-0 left-0 h-full w-2 bg-tech-accent/60" />
        <div
          className="
            mb-4 flex items-start justify-between border-b border-tech-accent/40
            pb-2 pl-4
          ">
          <h3
            className="
              text-lg font-bold tracking-widest text-tech-main uppercase
            ">
            OFFICIAL_RESOLUTION_
          </h3>
          {effectiveCanEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="
                cursor-pointer px-2 font-mono text-xs text-tech-main
                hover:underline
              ">
              [EDIT]
            </button>
          )}
        </div>
        <div
          className="pl-4 font-mono text-sm whitespace-pre-wrap text-zinc-800">
          {initialExplanation}
        </div>
      </BrutalCard>
    )
  }

  // NO explanation yet, but user CAN edit
  return (
    <BrutalCard
      className="
        border-dashed border-tech-accent/40 bg-white/40 py-6 text-center
      ">
      <div className="flex flex-col items-center gap-3 text-tech-accent/80">
        <span className="font-mono text-sm tracking-wider uppercase">
          AWAITING_OFFICIAL_RESOLUTION_
        </span>
        <BrutalButton
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="
            border border-tech-accent/40 text-tech-accent
            hover:bg-tech-accent/10
          ">
          PROVIDE EXPLANATION
        </BrutalButton>
      </div>
    </BrutalCard>
  )
}
