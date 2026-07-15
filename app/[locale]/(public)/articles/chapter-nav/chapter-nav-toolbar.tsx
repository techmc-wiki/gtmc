import { useTranslations } from "next-intl"
import { useState } from "react"

const BUTTON_CLASS_NAME = `
  min-h-11 cursor-pointer font-mono text-[0.625rem] whitespace-nowrap md:min-h-9
  transition-colors hover:bg-tech-main/5 hover:text-tech-main-dark
  focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2
  aria-disabled:cursor-not-allowed aria-disabled:opacity-50
`

export function ChapterNavToolbar({
  onCollapseAll,
  onLocate,
}: {
  onCollapseAll: () => void
  onLocate: () => void
}) {
  const [locateDisabled, setLocateDisabled] = useState(false)
  const t = useTranslations("ChapterNav")

  const handleLocate = () => {
    if (locateDisabled) return
    setLocateDisabled(true)
    onLocate()
    setTimeout(() => setLocateDisabled(false), 500)
  }

  return (
    <div className="grid shrink-0 grid-cols-2 border-b guide-line">
      <button
        type="button"
        onClick={onCollapseAll}
        className={BUTTON_CLASS_NAME}>
        {t("buttonCollapseAll")}
      </button>
      <button
        type="button"
        aria-disabled={locateDisabled}
        onClick={handleLocate}
        className={`${BUTTON_CLASS_NAME} border-l guide-line`}>
        {t("buttonLocate")}
      </button>
    </div>
  )
}
