"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { TabsList, TabsTrigger } from "@/components/ui/shadcn/tabs"

export type TabType = "write" | "preview" | "3-way" | "diff"

interface EditorTabStripProps {
  showThreeWayTab?: boolean
  showDiffTab?: boolean
  rightSlot?: React.ReactNode
}

export function EditorTabStrip({
  showThreeWayTab = false,
  showDiffTab = false,
  rightSlot,
}: EditorTabStripProps) {
  const t = useTranslations("Editor")

  const tabItems: { value: TabType; label: React.ReactNode }[] = []
  if (showThreeWayTab) {
    tabItems.push({ value: "3-way", label: t("tabThreeWay") })
  }
  tabItems.push({ value: "write", label: t("writeTab") })
  if (showDiffTab) {
    tabItems.push({ value: "diff", label: t("tabDiff") })
  }
  tabItems.push({ value: "preview", label: t("previewTab") })

  return (
    <div className="border-tech-main/40 bg-tech-main/3 relative flex items-center justify-between gap-3 overflow-hidden border-b font-mono text-[11px] tracking-widest uppercase">
      <div className="from-tech-main/0 via-tech-main/30 to-tech-main/0 absolute top-0 left-0 h-px w-full bg-linear-to-r" />
      <div className="flex h-[38px] items-center pl-1">
        <TabsList
          aria-label={t("editorModeAria")}
          className="flex-nowrap gap-0">
          {tabItems.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="group gap-2">
              <span className="bg-tech-main hidden size-1.5 animate-pulse group-data-[state=active]:block" />
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
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
