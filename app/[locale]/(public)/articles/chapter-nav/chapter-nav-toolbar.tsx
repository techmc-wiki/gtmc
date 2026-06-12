import { useTranslations } from "next-intl"
import React, { useState, useCallback } from "react"

export function ChapterNavToolbar({
  internalScroll,
  onCollapseAll,
  onLocate,
}: {
  internalScroll: boolean
  onCollapseAll: (e: React.MouseEvent) => void
  onLocate: () => void
}) {
  const [locateDisabled, setLocateDisabled] = useState(false)
  const t = useTranslations("ChapterNav")

  const handleLocate = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (locateDisabled) return
      setLocateDisabled(true)
      onLocate()
      e.currentTarget.blur()
      setTimeout(() => setLocateDisabled(false), 500)
    },
    [locateDisabled, onLocate]
  )

  const handleCollapseAllWithBlur = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onCollapseAll(e)
      e.currentTarget.blur()
    },
    [onCollapseAll]
  )

  if (internalScroll) {
    return (
      <div
        className="
          ml-0.5 shrink-0 border-b guide-line px-2 py-4
          backdrop-blur-sm
        ">
          <div className="flex gap-2 justify-between">
            <button
              type="button"
              onClick={handleCollapseAllWithBlur}
              className="
                w-full cursor-pointer border border-tech-main/40 px-2
                pl-2 font-mono text-[0.625rem] transition-colors
                hover:bg-tech-main-dark hover:text-tech-bg
              ">
              {t("buttonCollapseAll")}
            </button>
            <button
              type="button"
              disabled={locateDisabled}
              onClick={handleLocate}
              className="
                w-full cursor-pointer border border-tech-main/40 px-3 py-1.5
                pl-2 font-mono text-[0.625rem] transition-colors
                hover:bg-tech-main-dark hover:text-tech-bg
                disabled:cursor-not-allowed disabled:opacity-50
              ">
              {t("buttonLocate")}
            </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="
        sticky inset-x-0 -top-4 z-10 border-b guide-line bg-surface-overlay/70 py-3
        backdrop-blur-sm
      ">
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onCollapseAll}
          className="
            cursor-pointer border border-tech-main/40 px-3 py-1.5 font-mono
            text-[0.625rem] transition-colors
            hover:bg-tech-main-dark hover:text-tech-bg
          ">
          {t("buttonCollapseAll")}
        </button>
        <button
          type="button"
          disabled={locateDisabled}
          onClick={handleLocate}
          className="
            cursor-pointer border border-tech-main/40 px-3 py-1.5 font-mono
            text-[0.625rem] transition-colors
            hover:bg-tech-main-dark hover:text-tech-bg
            disabled:cursor-not-allowed disabled:opacity-50
          ">
          {t("buttonLocate")}
        </button>
      </div>
    </div>
  )
}
