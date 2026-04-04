"use client"

import * as React from "react"

interface EditorTabStripProps {
  activeTab: "write" | "preview"
  onTabChange: (tab: "write" | "preview") => void
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
  return (
    <div
      role="tablist"
      aria-label="Editor mode"
      className="
        flex items-center justify-between gap-3 border-b
        border-tech-main/40 bg-tech-main/10 font-mono text-xs
      ">
      <div className="flex items-center">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "write"}
          aria-controls={writeId}
          onClick={() => onTabChange("write")}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") onTabChange("preview")
          }}
          className={`
            px-4 py-2 transition-colors select-none
            ${
              activeTab === "write"
                ? `bg-tech-main text-white`
                : `
                  cursor-pointer text-tech-main/60
                  hover:bg-tech-main/10
                `
            }
          `}>
          WRITE_
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "preview"}
          aria-controls={previewId}
          onClick={() => onTabChange("preview")}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") onTabChange("write")
          }}
          className={`
            px-4 py-2 transition-colors select-none
            ${
              activeTab === "preview"
                ? `bg-tech-main text-white`
                : `
                  cursor-pointer text-tech-main/60
                  hover:bg-tech-main/10
                `
            }
          `}>
          PREVIEW_
        </button>
      </div>

      {rightSlot ? (
        <div className="pr-4 text-tech-main/60 uppercase">{rightSlot}</div>
      ) : null}
    </div>
  )
}
