"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { SegmentedControl } from "@/components/ui/segmented-control"

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

  const options: {
    value: TabType
    label: React.ReactNode
    ariaControls?: string
  }[] = React.useMemo(() => {
    const opts: {
      value: TabType
      label: React.ReactNode
      ariaControls?: string
    }[] = []

    if (showThreeWayTab) {
      opts.push({
        value: "3-way",
        label: (
          <span className="flex items-center gap-2">
            {activeTab === "3-way" && (
              <span className="bg-tech-main inline-block size-1.5 animate-pulse" />
            )}
            {t("tabThreeWay")}
          </span>
        ),
        ariaControls: threeWayId,
      })
    }

    opts.push({
      value: "write",
      label: (
        <span className="flex items-center gap-2">
          {activeTab === "write" && (
            <span className="bg-tech-main inline-block size-1.5 animate-pulse" />
          )}
          {t("writeTab")}
        </span>
      ),
      ariaControls: writeId,
    })

    if (showDiffTab) {
      opts.push({
        value: "diff",
        label: (
          <span className="flex items-center gap-2">
            {activeTab === "diff" && (
              <span className="bg-tech-main inline-block size-1.5 animate-pulse" />
            )}
            {t("tabDiff")}
          </span>
        ),
        ariaControls: diffId,
      })
    }

    opts.push({
      value: "preview",
      label: (
        <span className="flex items-center gap-2">
          {activeTab === "preview" && (
            <span className="bg-tech-main inline-block size-1.5 animate-pulse" />
          )}
          {t("previewTab")}
        </span>
      ),
      ariaControls: previewId,
    })

    return opts
  }, [
    activeTab,
    showThreeWayTab,
    showDiffTab,
    threeWayId,
    diffId,
    writeId,
    previewId,
    t,
  ])

  return (
    <div className="border-tech-main/40 bg-tech-main/3 relative flex items-center justify-between gap-3 overflow-hidden border-b font-mono text-[11px] tracking-widest uppercase">
      <div className="from-tech-main/0 via-tech-main/30 to-tech-main/0 absolute top-0 left-0 h-px w-full bg-linear-to-r" />
      <div className="flex h-[38px] items-center pl-1">
        <SegmentedControl<TabType>
          options={options}
          value={activeTab}
          onValueChange={onTabChange}
          controlRole="tablist"
          ariaLabel={t("editorModeAria")}
          size="sm"
          className="flex-nowrap gap-0"
        />
      </div>

      {rightSlot ? (
        <div className="text-tech-main/50 flex items-center gap-2 pr-4 text-[9px] uppercase">
          TARGET_BUFFER //{" "}
          <span className="text-tech-main-dark/80 font-bold">{rightSlot}</span>
        </div>
      ) : null}
    </div>
  )
}
