"use client"

import { useState } from "react"
import { InlineDiff } from "@/app/[locale]/(dashboard)/review/[id]/components/InlineDiff"
import { TechButton } from "@/components/ui/tech-button"

export interface ConflictBlockProps {
  id: string
  ours: string
  theirs: string
  onAcceptOurs: () => void
  onAcceptTheirs: () => void
  onManualEdit: (content: string) => void
  autoApplied?: { resolution: string; source: "rerere" }
}

export function ConflictBlock({
  id,
  ours,
  theirs,
  onAcceptOurs,
  onAcceptTheirs,
  onManualEdit,
  autoApplied,
}: ConflictBlockProps) {
  const [isManualEdit, setIsManualEdit] = useState(false)
  const [manualContent, setManualContent] = useState(ours)
  const [overrideAuto, setOverrideAuto] = useState(false)

  const showAutoResolved = autoApplied && !overrideAuto

  return (
    <div
      className="my-4 flex flex-col border border-red-500/50"
      data-conflict-id={id}>
      <div className="border-b border-red-500/30 bg-red-500/10 p-2 text-center text-xs font-bold tracking-widest text-red-700 uppercase">
        CONFLICT BLOCK
      </div>

      {autoApplied && (
        <div className="flex items-center gap-3 border-b border-red-500/20 px-3 py-2">
          <span className="border border-green-500/30 bg-green-500/10 px-3 py-1 font-mono text-xs tracking-widest text-green-700 uppercase">
            AUTO-RESOLVED (rerere)
          </span>
          {!overrideAuto && (
            <TechButton
              variant="ghost"
              size="sm"
              onClick={() => setOverrideAuto(true)}>
              OVERRIDE
            </TechButton>
          )}
        </div>
      )}

      {showAutoResolved ? (
        <div className="p-3">
          <pre className="border border-green-500/20 bg-green-500/5 p-3 font-mono text-sm/relaxed whitespace-pre-wrap text-green-900">
            {autoApplied.resolution}
          </pre>
        </div>
      ) : (
        <>
          {!isManualEdit && (
            <div className="flex flex-col md:flex-row">
              <div className="flex flex-1 flex-col border-b border-amber-500/20 bg-amber-500/5 md:border-r md:border-b-0">
                <div className="border-b border-amber-500/20 px-3 py-1.5">
                  <span className="font-mono text-xs font-bold tracking-widest text-amber-700 uppercase">
                    YOUR CHANGES (draft)
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  <InlineDiff
                    currentText={ours}
                    incomingText={theirs}
                    mode="current"
                  />
                </div>
                <div className="border-t border-amber-500/20 p-2">
                  <TechButton
                    variant="secondary"
                    size="sm"
                    className="w-full border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
                    onClick={onAcceptOurs}>
                    ACCEPT DRAFT
                  </TechButton>
                </div>
              </div>

              <div className="flex flex-1 flex-col bg-blue-500/5">
                <div className="border-b border-blue-500/20 px-3 py-1.5">
                  <span className="font-mono text-xs font-bold tracking-widest text-blue-700 uppercase">
                    MAIN CHANGES
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  <InlineDiff
                    currentText={ours}
                    incomingText={theirs}
                    mode="incoming"
                  />
                </div>
                <div className="border-t border-blue-500/20 p-2">
                  <TechButton
                    variant="secondary"
                    size="sm"
                    className="w-full border-blue-500/50 text-blue-700 hover:bg-blue-500/10"
                    onClick={onAcceptTheirs}>
                    ACCEPT MAIN
                  </TechButton>
                </div>
              </div>
            </div>
          )}

          {isManualEdit && (
            <div className="flex flex-col gap-2 p-3">
              <span className="font-mono text-xs font-bold tracking-widest text-tech-main uppercase">
                MANUAL EDIT
              </span>
              <textarea
                className="min-h-[160px] w-full resize-y border border-tech-main/40 bg-tech-bg p-2 font-mono text-sm text-tech-main focus:border-tech-main focus:outline-none"
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
              />
              <div className="flex gap-2">
                <TechButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onManualEdit(manualContent)
                    setIsManualEdit(false)
                  }}>
                  APPLY MANUAL EDIT
                </TechButton>
                <TechButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setManualContent(ours)
                    setIsManualEdit(false)
                  }}>
                  CANCEL
                </TechButton>
              </div>
            </div>
          )}

          {!isManualEdit && (
            <div className="flex justify-center border-t border-red-500/20 p-2">
              <TechButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setManualContent(ours)
                  setIsManualEdit(true)
                }}>
                MANUAL EDIT
              </TechButton>
            </div>
          )}
        </>
      )}
    </div>
  )
}
