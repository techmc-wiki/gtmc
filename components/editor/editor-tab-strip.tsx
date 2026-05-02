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
              <span className="inline-block size-1.5 animate-pulse bg-tech-main" />
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
            <span className="inline-block size-1.5 animate-pulse bg-tech-main" />
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
              <span className="inline-block size-1.5 animate-pulse bg-tech-main" />
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
            <span className="inline-block size-1.5 animate-pulse bg-tech-main" />
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
    <div
      className="
        relative flex items-center justify-between gap-3 overflow-hidden
        border-b border-tech-main/40 bg-tech-main/3 font-mono text-[11px] tracking-widest uppercase
      ">
      <div className="absolute top-0 left-0 h-px w-full bg-linear-to-r from-tech-main/0 via-tech-main/30 to-tech-main/0" />
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
        <div className="flex items-center gap-2 pr-4 text-[9px] text-tech-main/50 uppercase">
          TARGET_BUFFER //{" "}
          <span className="font-bold text-tech-main-dark/80">{rightSlot}</span>
        </div>
      ) : null}
    </div>
  )
}
