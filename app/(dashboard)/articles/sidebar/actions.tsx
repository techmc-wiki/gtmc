"use client"

import { useState } from "react"

export function SidebarActions({
  internalScroll,
  onCreate,
  onCollapseAll,
  onLocate,
}: {
  internalScroll: boolean
  onCreate: () => void
  onCollapseAll: (e: React.MouseEvent) => void
  onLocate: () => void
}) {
  const [locateDisabled, setLocateDisabled] = useState(false)

  const handleLocate = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (locateDisabled) return
    setLocateDisabled(true)
    onLocate()
    e.currentTarget.blur()
    setTimeout(() => setLocateDisabled(false), 500)
  }

  if (internalScroll) {
    return (
      <div
        className="
          ml-0.5 shrink-0 border-b guide-line bg-white/95 px-6 py-3
          backdrop-blur-sm
        ">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onCreate}
            className="
              cursor-pointer border border-tech-main/40 px-3 py-1.5 pl-2
              font-mono text-[11px] transition-colors
              hover:bg-tech-main hover:text-white
            ">
            + NEW DIR / FILE
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                onCollapseAll(e)
                e.currentTarget.blur()
              }}
              className="
                flex-3 cursor-pointer border border-tech-main/40 px-3 py-1.5
                pl-2 font-mono text-[11px] transition-colors
                hover:bg-tech-main hover:text-white
              ">
              ⊟ COLLAPSE ALL
            </button>
            <button
              type="button"
              disabled={locateDisabled}
              onClick={handleLocate}
              className="
                flex-2 cursor-pointer border border-tech-main/40 px-3 py-1.5
                pl-2 font-mono text-[11px] transition-colors
                hover:bg-tech-main hover:text-white
                disabled:opacity-50 disabled:cursor-not-allowed
              ">
              ◎ LOCATE
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="
        sticky inset-x-0 -top-4 z-10 border-b guide-line bg-white/70 py-3
        backdrop-blur-sm
      ">
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onCollapseAll}
          className="
            cursor-pointer border border-tech-main/40 px-3 py-1.5 font-mono
            text-[10px] transition-colors
            hover:bg-tech-main hover:text-white
          ">
          ⊟ COLLAPSE ALL
        </button>
        <button
          type="button"
          disabled={locateDisabled}
          onClick={handleLocate}
          className="
            cursor-pointer border border-tech-main/40 px-3 py-1.5 font-mono
            text-[10px] transition-colors
            hover:bg-tech-main hover:text-white
            disabled:opacity-50 disabled:cursor-not-allowed
          ">
          ◎ LOCATE
        </button>
        <button
          type="button"
          onClick={onCreate}
          className="
            cursor-pointer border border-tech-main/40 px-3 py-1.5 font-mono
            text-[10px] transition-colors
            hover:bg-tech-main hover:text-white
          ">
          + NEW DIR / FILE
        </button>
      </div>
    </div>
  )
}
