interface ChapterEndMarkProps {
  isAdvanced?: boolean
}

export function ChapterEndMark({ isAdvanced }: ChapterEndMarkProps) {
  const accent = isAdvanced ? "bg-tech-advanced" : "bg-tech-signal"

  return (
    <div
      className="mt-14 flex items-center justify-center gap-4"
      aria-hidden="true">
      <span className="bg-tech-main/20 h-px w-20" />
      <span className="flex items-center gap-1.5">
        <span className="bg-tech-main/40 size-1 rotate-45" />
        <span className={`${accent} size-1.5 rotate-45`} />
        <span className="bg-tech-main/40 size-1 rotate-45" />
      </span>
      <span className="bg-tech-main/20 h-px w-20" />
    </div>
  )
}
