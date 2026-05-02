"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { TechCard } from "@/components/ui/tech-card"
import { TechButton } from "@/components/ui/tech-button"
import { TextAreaBox } from "@/components/ui/textarea-box"
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
  const t = useTranslations("Feature")
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
      <TechCard tone="accent" borderOpacity="muted" background="default">
        <h3
          className="
            mb-2 border-b border-tech-accent/40 pb-2 text-lg font-bold
            tracking-widest text-tech-main uppercase
          ">
          {t("editResolutionExplanation")}
        </h3>
        <TextAreaBox
          className="mb-4"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder={t("explanationPlaceholder")}
          disabled={isPending}
          aria-busy={isPending}
        />
        <div className="flex justify-end gap-2">
          <TechButton
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
            disabled={isPending}>
            {t("cancelButton")}
          </TechButton>
          <TechButton
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
              t("saveExplanationButton")
            )}
          </TechButton>
        </div>
      </TechCard>
    )
  }

  if (initialExplanation) {
    return (
      <TechCard
        tone="accent"
        borderOpacity="muted"
        background="subtle"
        className="group relative overflow-hidden">
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
            {t("officialResolution")}
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
        <div className="pl-4 font-mono text-sm whitespace-pre-wrap text-zinc-800">
          {initialExplanation}
        </div>
      </TechCard>
    )
  }

  // NO explanation yet, but user CAN edit
  return (
    <TechCard
      tone="accent"
      borderOpacity="muted"
      background="ghost"
      className="border-dashed py-6 text-center">
      <div className="flex flex-col items-center gap-3 text-tech-accent/80">
        <span className="font-mono text-sm tracking-wider uppercase">
          AWAITING_OFFICIAL_RESOLUTION_
        </span>
        <TechButton
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="
            border border-tech-accent/40 text-tech-accent
            hover:bg-tech-accent/10
          ">
          PROVIDE EXPLANATION
        </TechButton>
      </div>
    </TechCard>
  )
}
