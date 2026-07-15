import { useTranslations } from "next-intl"
import { useState, type MouseEvent } from "react"

export function ChapterNavToolbar({
  onCollapseAll,
  onLocate,
}: {
  onCollapseAll: () => void
  onLocate: () => void
}) {
  const [locateDisabled, setLocateDisabled] = useState(false)
  const t = useTranslations("ChapterNav")

  const handleLocate = (event: MouseEvent<HTMLButtonElement>) => {
    if (locateDisabled) return
    setLocateDisabled(true)
    onLocate()
    event.currentTarget.blur()
    setTimeout(() => setLocateDisabled(false), 500)
  }

  const handleCollapseAll = (event: MouseEvent<HTMLButtonElement>) => {
    onCollapseAll()
    event.currentTarget.blur()
  }

  const buttonClassName = `
    min-h-11 cursor-pointer font-mono text-[0.625rem] whitespace-nowrap md:min-h-9
    transition-colors hover:bg-tech-main/5 hover:text-tech-main-dark
    focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2
    disabled:cursor-not-allowed disabled:opacity-50
  `

  return (
    <div className="grid shrink-0 grid-cols-2 border-b guide-line">
      <button
        type="button"
        onClick={handleCollapseAll}
        className={buttonClassName}>
        {t("buttonCollapseAll")}
      </button>
      <button
        type="button"
        disabled={locateDisabled}
        onClick={handleLocate}
        className={`${buttonClassName} border-l guide-line`}>
        {t("buttonLocate")}
      </button>
    </div>
  )
}
