"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

export type TabType = "write" | "preview" | "3-way" | "diff"

interface EditorTabStripProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  writeId: string
  previewId: string
  rightSlot?: React.ReactNode
}

export function EditorTabStrip({
  activeTab,
  onTabChange,
  writeId,
  previewId,
  rightSlot,
}: EditorTabStripProps) {
  const t = useTranslations("Editor")

  const tabs: { id: TabType; label: string; ariaControls?: string }[] = [
    { id: "write", label: t("writeTab"), ariaControls: writeId },
    { id: "preview", label: t("previewTab"), ariaControls: previewId },
  ]

  return (
    <div
      role="tablist"
      aria-label={t("editorModeAria")}
      className="
        flex items-center justify-between gap-3 border-b border-tech-main/40
        bg-tech-main/10 font-mono text-xs
      ">
      <div className="flex items-center">
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={tab.ariaControls}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight")
                onTabChange(tabs[(idx + 1) % tabs.length].id)
              if (e.key === "ArrowLeft")
                onTabChange(tabs[(idx - 1 + tabs.length) % tabs.length].id)
            }}
            className={`
              px-4 py-2 transition-colors select-none
              ${
                activeTab === tab.id
                  ? `bg-tech-main text-white`
                  : `
                    cursor-pointer text-tech-main/60
                    hover:bg-tech-main/10
                  `
              }
            `}>
            {tab.label}
          </button>
        ))}
      </div>

      {rightSlot ? (
        <div className="pr-4 text-tech-main/60 uppercase">{rightSlot}</div>
      ) : null}
    </div>
  )
}
