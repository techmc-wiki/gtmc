import { articleUrl } from "@/lib/articles/url"

interface RunningHeadProps {
  chapterTitle: string
  chapterSlug: string
  locale: string
  chapterIndex?: number
  chapterIsAppendix?: boolean
  articleIsAppendix?: boolean
  isPreface?: boolean
}

function formatChapterLabel(
  index: number | undefined,
  isAppendix: boolean | undefined,
  isPreface: boolean | undefined
): string | null {
  if (isPreface) return "00"
  if (index === undefined || index < 0) return null
  if (isAppendix) {
    if (index < 1 || index > 26) return null
    return String.fromCharCode(64 + index)
  }
  return String(index).padStart(2, "0")
}

export function RunningHead({
  chapterTitle,
  chapterSlug,
  locale,
  chapterIndex,
  chapterIsAppendix,
  articleIsAppendix,
  isPreface,
}: RunningHeadProps) {
  const label = formatChapterLabel(
    chapterIndex,
    chapterIsAppendix,
    isPreface
  )

  return (
    <nav
      aria-label="Chapter"
      className="mb-4 flex flex-wrap items-center gap-2 font-mono text-[0.6875rem] tracking-[0.15em] uppercase sm:text-xs">
      {label ? (
        <span className="bg-tech-signal text-tech-signal-ink inline-flex h-5 items-center px-1.5 text-[0.625rem] font-bold tracking-wider">
          {chapterIsAppendix ? "APP" : "CH"} {label}
        </span>
      ) : articleIsAppendix ? (
        <span className="bg-tech-signal text-tech-signal-ink inline-flex h-5 items-center px-1.5 text-[0.625rem] font-bold tracking-wider">
          APP
        </span>
      ) : null}
      <a
        href={`/${locale}${articleUrl(chapterSlug)}`}
        className="text-tech-main/70 hover:text-tech-main-dark hover:decoration-tech-main/40 transition-colors hover:underline hover:underline-offset-4">
        {chapterTitle}
      </a>
      <span aria-hidden="true" className="text-tech-main/40">
        ›
      </span>
      <span className="text-tech-main/40">§</span>
    </nav>
  )
}
