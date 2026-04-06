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
      className="border border-red-500/50 my-4 flex flex-col"
      data-conflict-id={id}>
      <div className="bg-red-500/10 border-b border-red-500/30 text-red-700 text-xs font-bold tracking-widest uppercase text-center p-2">
        CONFLICT BLOCK
      </div>

      {autoApplied && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-red-500/20">
          <span className="bg-green-500/10 border border-green-500/30 text-green-700 font-mono text-xs tracking-widest uppercase px-3 py-1">
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
          <pre className="font-mono text-sm/relaxed whitespace-pre-wrap bg-green-500/5 border border-green-500/20 p-3 text-green-900">
            {autoApplied.resolution}
          </pre>
        </div>
      ) : (
        <>
          {!isManualEdit && (
            <div className="flex flex-col md:flex-row">
              <div className="flex flex-1 flex-col bg-amber-500/5 border-b md:border-b-0 md:border-r border-amber-500/20">
                <div className="px-3 py-1.5 border-b border-amber-500/20">
                  <span className="text-amber-700 text-xs font-mono font-bold tracking-widest uppercase">
                    YOUR CHANGES (draft)
                  </span>
                </div>
                <div className="p-3 flex-1 overflow-auto">
                  <InlineDiff
                    currentText={ours}
                    incomingText={theirs}
                    mode="current"
                  />
                </div>
                <div className="p-2 border-t border-amber-500/20">
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
                <div className="px-3 py-1.5 border-b border-blue-500/20">
                  <span className="text-blue-700 text-xs font-mono font-bold tracking-widest uppercase">
                    MAIN CHANGES
                  </span>
                </div>
                <div className="p-3 flex-1 overflow-auto">
                  <InlineDiff
                    currentText={ours}
                    incomingText={theirs}
                    mode="incoming"
                  />
                </div>
                <div className="p-2 border-t border-blue-500/20">
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
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-tech-main">
                MANUAL EDIT
              </span>
              <textarea
                className="w-full min-h-[160px] font-mono text-sm p-2 border border-tech-main/40 bg-tech-bg text-tech-main focus:outline-none focus:border-tech-main resize-y"
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
            <div className="border-t border-red-500/20 p-2 flex justify-center">
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
