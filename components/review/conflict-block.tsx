"use client"

import * as React from "react"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { TechButton } from "@/components/ui/tech-button"
import { MergeView } from "@codemirror/merge"
import { EditorView } from "@codemirror/view"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"

const mergeTheme = EditorView.theme({
  "&": {
    fontFamily: "var(--font-mono)",
    fontSize: "0.875rem",
    lineHeight: "1.625",
  },
  ".cm-mergeView": {
    border: "none",
  },
  ".cm-mergeViewEditors": {
    minHeight: "100px",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-merge-revert": {
    cursor: "pointer",
    background: "rgba(0, 0, 0, 0.1)",
    border: "none",
    padding: "2px 6px",
    borderRadius: "0",
    fontWeight: "bold",
    "&:hover": {
      background: "rgba(0, 0, 0, 0.2)",
    },
  },
})

export interface ConflictBlockProps {
  id: string
  index?: number
  total?: number
  ours: string
  theirs: string
  onAcceptOurs: () => void
  onAcceptTheirs: () => void
  onManualEdit: (content: string) => void
  autoApplied?: { resolution: string; source: "rerere" }
}

export function ConflictBlock({
  id,
  index,
  total,
  ours,
  theirs,
  onAcceptOurs,
  onAcceptTheirs,
  onManualEdit,
  autoApplied,
}: ConflictBlockProps) {
  const t = useTranslations("Review")
  const editorT = useTranslations("Editor")
  const [isManualEdit, setIsManualEdit] = useState(false)
  const [manualContent, setManualContent] = useState(ours)
  const [overrideAuto, setOverrideAuto] = useState(false)
  const [justResolved, setJustResolved] = useState(false)
  const mergeViewContainer = React.useRef<HTMLDivElement>(null)

  const showAutoResolved = autoApplied && !overrideAuto

  const flashResolved = () => {
    setJustResolved(true)
    setTimeout(() => setJustResolved(false), 200)
  }

  const handleAcceptOurs = () => {
    flashResolved()
    onAcceptOurs()
  }

  const handleAcceptTheirs = () => {
    flashResolved()
    onAcceptTheirs()
  }

  React.useEffect(() => {
    if (!mergeViewContainer.current || isManualEdit || showAutoResolved) return

    const view = new MergeView({
      a: {
        doc: ours,
        extensions: [
          EditorView.editable.of(false),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          mergeTheme,
        ],
      },
      b: {
        doc: theirs,
        extensions: [
          EditorView.editable.of(false),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          mergeTheme,
        ],
      },
      parent: mergeViewContainer.current,
      orientation: "a-b",
      revertControls: "a-to-b",
    })

    return () => view.destroy()
  }, [ours, theirs, isManualEdit, showAutoResolved])

  const counterLabel =
    index !== undefined && total !== undefined
      ? t("conflictNofN", { current: index, total })
      : "CONFLICT_BLOCK_"

  return (
    <div
      className={`my-4 flex flex-col border border-l-4 border-red-500/50 transition-colors duration-200 ${
        justResolved
          ? "border-l-green-500 bg-green-500/5"
          : showAutoResolved
            ? "border-l-green-500"
            : "border-l-red-500"
      }`}
      data-conflict-id={id}>
      <div className="border-b border-red-500/30 bg-red-500/10 p-2 text-center text-xs font-bold tracking-widest text-red-700 uppercase">
        {counterLabel}
      </div>

      {autoApplied && (
        <div className="flex items-center gap-3 border-b border-red-500/20 px-3 py-2">
          <span className="border border-green-500/30 bg-green-500/10 px-3 py-1 font-mono text-xs tracking-widest text-green-700 uppercase">
            {t("autoResolved")}
          </span>
          {!overrideAuto && (
            <TechButton
              variant="ghost"
              size="sm"
              onClick={() => setOverrideAuto(true)}>
              {t("override")}
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
            <div className="flex flex-col">
              <div className="flex">
                <div className="flex-1 border-b border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
                  <span className="font-mono text-xs font-bold tracking-widest text-amber-700 uppercase">
                    {t("ourChanges")}
                  </span>
                </div>
                <div className="w-px bg-red-500/20" />
                <div className="flex-1 border-b border-blue-500/20 bg-blue-500/5 px-3 py-1.5">
                  <span className="font-mono text-xs font-bold tracking-widest text-blue-700 uppercase">
                    {t("theirChanges")}
                  </span>
                </div>
              </div>

              <div className="flex-1" ref={mergeViewContainer} />

              <div className="flex border-t border-red-500/20">
                <div className="flex-1 border-r border-red-500/20 bg-amber-500/5 p-2">
                  <TechButton
                    variant="secondary"
                    size="sm"
                    className="min-h-11 w-full border-amber-500/50 text-amber-700 hover:border-amber-500 hover:bg-amber-500/20"
                    onClick={handleAcceptOurs}>
                    {t("acceptDraft")}
                  </TechButton>
                </div>
                <div className="flex-1 bg-blue-500/5 p-2">
                  <TechButton
                    variant="secondary"
                    size="sm"
                    className="min-h-11 w-full border-blue-500/50 text-blue-700 hover:border-blue-500 hover:bg-blue-500/20"
                    onClick={handleAcceptTheirs}>
                    {t("acceptMain")}
                  </TechButton>
                </div>
              </div>
            </div>
          )}

          {isManualEdit && (
            <div className="flex flex-col gap-2 p-3">
              <span className="text-tech-main font-mono text-xs font-bold tracking-widest uppercase">
                {t("manualEdit")}
              </span>
              <textarea
                className="border-tech-main/40 bg-tech-bg text-tech-main focus:border-tech-main min-h-[160px] w-full resize-y border p-2 font-mono text-sm focus:outline-none"
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
                  {t("applyManualEdit")}
                </TechButton>
                <TechButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setManualContent(ours)
                    setIsManualEdit(false)
                  }}>
                  {editorT("cancelButton")}
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
                {t("manualEdit")}
              </TechButton>
            </div>
          )}
        </>
      )}
    </div>
  )
}
