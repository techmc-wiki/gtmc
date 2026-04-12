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
        relative flex items-center justify-between gap-3 overflow-hidden
        border-b border-tech-main/40 bg-tech-main/3 font-mono text-[11px] tracking-widest uppercase
      ">
      <div className="absolute top-0 left-0 h-px w-full bg-linear-to-r from-tech-main/0 via-tech-main/30 to-tech-main/0" />
      <div className="flex h-[38px] items-center pl-1">
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
              relative flex h-full min-w-[100px] items-center justify-center px-5 transition-all select-none
              before:absolute before:inset-0 before:border-r before:guide-line
              after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:transition-transform after:duration-300
              ${
                activeTab === tab.id
                  ? `
                    bg-white/60 font-bold text-tech-main backdrop-blur-sm
                    after:scale-x-100 after:bg-tech-main
                  `
                  : `
                    cursor-pointer bg-transparent text-tech-main/50
                    after:scale-x-0 after:bg-tech-main/30
                    hover:bg-tech-main/10 hover:text-tech-main/80 hover:after:scale-x-100
                  `
              }
            `}>
            <span className="relative z-10 flex items-center gap-2">
              {activeTab === tab.id && (
                <span className="inline-block size-1.5 animate-pulse bg-tech-main" />
              )}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {rightSlot ? (
        <div className="flex items-center gap-2 pr-4 text-[9px] text-tech-main/50 uppercase">
          TARGET_BUFFER //{" "}
          <span className="font-bold text-tech-main-dark/80">{rightSlot}</span>
        </div>
      ) : null}
    </div>
  )
}
