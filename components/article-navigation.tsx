import Link from "next/link"
import { CornerBrackets } from "./ui/corner-brackets"

interface ArticleInfo {
  slug: string
  title: string
  isCrossFolder: boolean
}

interface ArticleNavigationProps {
  prev: ArticleInfo | null
  next: ArticleInfo | null
}

export function ArticleNavigation({ prev, next }: ArticleNavigationProps) {
  return (
    <nav className="relative mt-12 border-t border-tech-main/20 pt-8">
      <CornerBrackets size="size-3" color="border-tech-main/30" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="flex">
          {prev ? (
            <Link
              href={`/articles/${prev.slug}`}
              className="group relative flex w-full flex-col gap-2 border border-tech-main/40 bg-tech-bg p-4 transition-colors hover:border-tech-main hover:bg-tech-accent/10 min-h-[44px]">
              <div className="flex items-center gap-2 font-mono text-xs text-tech-main/60">
                <span>←</span>
                <span>PREV</span>
                {prev.isCrossFolder && (
                  <span className="rounded border border-tech-main/40 px-1.5 py-0.5 text-[10px]">
                    ↗
                  </span>
                )}
              </div>
              <div className="font-mono text-sm text-tech-main line-clamp-2">
                {prev.title}
              </div>
            </Link>
          ) : (
            <div className="flex w-full flex-col gap-2 border border-tech-main/20 bg-tech-bg p-4 opacity-50 pointer-events-none min-h-[44px]">
              <div className="flex items-center gap-2 font-mono text-xs text-tech-main/40">
                <span>←</span>
                <span>PREV</span>
              </div>
              <div className="font-mono text-sm text-tech-main/40">
                No previous article
              </div>
            </div>
          )}
        </div>

        <div className="flex">
          {next ? (
            <Link
              href={`/articles/${next.slug}`}
              className="group relative flex w-full flex-col gap-2 border border-tech-main/40 bg-tech-bg p-4 transition-colors hover:border-tech-main hover:bg-tech-accent/10 min-h-[44px] md:items-end md:text-right">
              <div className="flex items-center gap-2 font-mono text-xs text-tech-main/60">
                {next.isCrossFolder && (
                  <span className="rounded border border-tech-main/40 px-1.5 py-0.5 text-[10px]">
                    ↗
                  </span>
                )}
                <span>NEXT</span>
                <span>→</span>
              </div>
              <div className="font-mono text-sm text-tech-main line-clamp-2">
                {next.title}
              </div>
            </Link>
          ) : (
            <div className="flex w-full flex-col gap-2 border border-tech-main/20 bg-tech-bg p-4 opacity-50 pointer-events-none min-h-[44px] md:items-end md:text-right">
              <div className="flex items-center gap-2 font-mono text-xs text-tech-main/40">
                <span>NEXT</span>
                <span>→</span>
              </div>
              <div className="font-mono text-sm text-tech-main/40">
                No next article
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
