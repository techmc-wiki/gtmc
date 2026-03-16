"use client";

import { useState, useTransition } from "react";
import { BrutalCard } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { updateFeatureExplanation } from "@/actions/feature";
import { LoadingIndicator, PENDING_LABELS } from "../loading-indicator";

interface FeatureExplanationProps {
  featureId: string;
  initialExplanation: string | null;
  isAssignee: boolean;
  isAdmin: boolean;
  isClosed?: boolean;
}

export function FeatureExplanation({
  featureId,
  initialExplanation,
  isAssignee,
  isAdmin,
  isClosed,
}: FeatureExplanationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [explanation, setExplanation] = useState(initialExplanation || "");
  const [isPending, startTransition] = useTransition();

  const canEdit = isAssignee || isAdmin;
  const effectiveCanEdit = canEdit && !isClosed;

  const handleSave = () => {
    startTransition(async () => {
      await updateFeatureExplanation(featureId, explanation);
      setIsEditing(false);
    });
  };

  if (!initialExplanation && !effectiveCanEdit) return null;

  if (isEditing) {
    return (
      <BrutalCard className="border-tech-accent/40 bg-white/80 backdrop-blur-sm">
        <h3 className="text-tech-main border-tech-accent/40 mb-2 border-b pb-2 text-lg font-bold tracking-widest uppercase">
          EDIT_RESOLUTION_EXPLANATION_
        </h3>
        <textarea
          className="border-tech-accent/40 focus:border-tech-accent/60 mb-4 min-h-30 w-full resize-y border bg-white/80 p-4 font-mono text-sm text-black placeholder-zinc-500 backdrop-blur-sm focus:ring-0 focus:outline-none"
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
            disabled={isPending}
          >
            CANCEL
          </BrutalButton>
          <BrutalButton
            variant="primary"
            size="sm"
            className="bg-tech-accent border-tech-accent hover:bg-tech-accent/90 text-white"
            onClick={handleSave}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? (
              <LoadingIndicator label={PENDING_LABELS.SAVING_EXPLANATION} />
            ) : (
              "SAVE_EXPLANATION"
            )}
          </BrutalButton>
        </div>
      </BrutalCard>
    );
  }

  if (initialExplanation) {
    return (
      <BrutalCard className="border-tech-accent/40 bg-tech-accent/5 group relative overflow-hidden backdrop-blur-sm">
        <div className="bg-tech-accent/60 absolute top-0 left-0 h-full w-2"></div>
        <div className="border-tech-accent/40 mb-4 flex items-start justify-between border-b pb-2 pl-4">
          <h3 className="text-tech-main text-lg font-bold tracking-widest uppercase">
            OFFICIAL_RESOLUTION_
          </h3>
          {effectiveCanEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-tech-main cursor-pointer px-2 font-mono text-xs hover:underline"
            >
              [EDIT]
            </button>
          )}
        </div>
        <div className="pl-4 font-mono text-sm whitespace-pre-wrap text-zinc-800">
          {initialExplanation}
        </div>
      </BrutalCard>
    );
  }

  // NO explanation yet, but user CAN edit
  return (
    <BrutalCard className="border-tech-accent/40 border-dashed bg-white/40 py-6 text-center">
      <div className="text-tech-accent/80 flex flex-col items-center gap-3">
        <span className="font-mono text-sm tracking-wider uppercase">
          AWAITING_OFFICIAL_RESOLUTION_
        </span>
        <BrutalButton
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="border-tech-accent/40 text-tech-accent hover:bg-tech-accent/10 border"
        >
          PROVIDE EXPLANATION
        </BrutalButton>
      </div>
    </BrutalCard>
  );
}
