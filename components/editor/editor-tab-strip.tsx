"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

export type TabType = "write" | "preview" | "3-way" | "diff"

interface EditorTabStripProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  writeId: string
  previewId: string
  threeWayId?: string
  diffId?: string
  showThreeWayTab?: boolean
  showDiffTab?: boolean
  rightSlot?: React.ReactNode
}

export function EditorTabStrip({
  activeTab,
  onTabChange,
  writeId,
  previewId,
  threeWayId,
  diffId,
  showThreeWayTab = false,
  showDiffTab = false,
  rightSlot,
}: EditorTabStripProps) {
  const t = useTranslations("Editor")

  const tabs: { id: TabType; label: string; ariaControls?: string }[] = [
    ...(showThreeWayTab
      ? [
          {
            id: "3-way" as const,
            label: t("tabThreeWay"),
            ariaControls: threeWayId,
          },
        ]
      : []),
    { id: "write", label: t("writeTab"), ariaControls: writeId },
    ...(showDiffTab
      ? [{ id: "diff" as const, label: t("tabDiff"), ariaControls: diffId }]
      : []),
    { id: "preview", label: t("previewTab"), ariaControls: previewId },
  ]

  return (
    <div
      role="tablist"
      aria-label={t("editorModeAria")}
      className="
        flex items-center justify-between gap-3 border-b border-tech-main/40
        bg-tech-main/[0.03] font-mono text-[11px] uppercase tracking-widest relative overflow-hidden
      ">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-tech-main/0 via-tech-main/30 to-tech-main/0" />
      <div className="flex items-center h-[38px] pl-1">
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
              relative h-full px-5 transition-all select-none flex items-center justify-center min-w-[100px]
              before:absolute before:inset-0 before:border-r before:border-tech-main/20
              after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:transition-transform after:duration-300
              ${
                activeTab === tab.id
                  ? `
                    text-tech-main font-bold bg-white/60 backdrop-blur-sm
                    after:bg-tech-main after:scale-x-100
                  `
                  : `
                    cursor-pointer text-tech-main/50 bg-transparent
                    hover:bg-tech-main/10 hover:text-tech-main/80
                    after:bg-tech-main/30 after:scale-x-0 hover:after:scale-x-100
                  `
              }
            `}>
            <span className="relative z-10 flex items-center gap-2">
              {activeTab === tab.id && <span className="inline-block w-1.5 h-1.5 bg-tech-main animate-pulse" />}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {rightSlot ? (
        <div className="pr-4 text-tech-main/50 uppercase text-[9px] flex items-center gap-2">
          TARGET_BUFFER // <span className="font-bold text-tech-main-dark/80">{rightSlot}</span>
        </div>
      ) : null}
    </div>
  )
}
