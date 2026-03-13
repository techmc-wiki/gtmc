"use client";

import { useState, useTransition } from "react";
import { BrutalCard } from "@/components/ui/brutal-card";
import { BrutalButton } from "@/components/ui/brutal-button";
import { updateFeatureExplanation } from "@/actions/feature";

interface FeatureExplanationProps {
  featureId: string;
  initialExplanation: string | null;
  isAssignee: boolean;
  isAdmin: boolean;
}

export function FeatureExplanation({
  featureId,
  initialExplanation,
  isAssignee,
  isAdmin,
}: FeatureExplanationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [explanation, setExplanation] = useState(initialExplanation || "");
  const [isPending, startTransition] = useTransition();

  const canEdit = isAssignee || isAdmin;

  const handleSave = () => {
    startTransition(async () => {
      await updateFeatureExplanation(featureId, explanation);
      setIsEditing(false);
    });
  };

  if (!initialExplanation && !canEdit) return null;

  if (isEditing) {
    return (
      <BrutalCard className="mb-8 border-tech-accent/50 bg-white/60 backdrop-blur-sm">
        <h3 className="text-lg font-bold tracking-widest uppercase mb-2 text-tech-main border-b border-tech-accent/20 pb-2">
          EDIT_RESOLUTION_EXPLANATION_
        </h3>
        <textarea
          className="w-full min-h-30 p-3 border border-tech-accent/40 text-black placeholder-zinc-500 focus:border-tech-accent bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-0 font-mono text-sm resize-y mb-4"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="PROVIDE OFFICIAL EXPLANATION / RESOLUTION..."
          disabled={isPending}
        />
        <div className="flex gap-2 justify-end">
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
            className="bg-tech-accent border-tech-accent text-white hover:bg-tech-accent/90"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "SAVING..." : "SAVE_EXPLANATION"}
          </BrutalButton>
        </div>
      </BrutalCard>
    );
  }

  if (initialExplanation) {
    return (
      <BrutalCard className="mb-8 border-tech-accent/50 bg-tech-accent/5 backdrop-blur-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full bg-tech-accent opacity-80"></div>
        <div className="flex justify-between items-start mb-4 border-b border-tech-accent/20 pb-2 pl-4">
          <h3 className="text-lg font-bold tracking-widest uppercase text-tech-main">
            OFFICIAL_RESOLUTION_
          </h3>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-mono text-tech-main hover:underline px-2"
            >
              [EDIT]
            </button>
          )}
        </div>
        <div className="whitespace-pre-wrap font-mono text-sm text-zinc-800 pl-4">
          {initialExplanation}
        </div>
      </BrutalCard>
    );
  }

  // NO explanation yet, but user CAN edit
  return (
    <BrutalCard className="mb-8 border-dashed border-tech-accent/30 bg-white/40 py-6 text-center">
      <div className="flex flex-col items-center gap-3 text-tech-accent/80">
        <span className="font-mono text-sm uppercase tracking-wider">
          AWAITING_OFFICIAL_RESOLUTION_
        </span>
        <BrutalButton
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="border border-tech-accent/30 text-tech-accent hover:bg-tech-accent/10"
        >
          PROVIDE EXPLANATION
        </BrutalButton>
      </div>
    </BrutalCard>
  );
}
