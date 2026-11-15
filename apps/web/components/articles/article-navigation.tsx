import { ArrowLeft, ArrowRight } from "lucide-react"

import { articleUrl } from "@/lib/articles/url"
import { cn } from "@/lib/cn"

import { Separator } from "../ui/shadcn/separator"

interface ArticleInfo {
  slug: string
  title: string
  isCrossFolder: boolean
  chapterTitle?: string
}

interface ArticleNavigationProps {
  locale: string
  nextLabel: string
  prev: ArticleInfo | null
  prevLabel: string
  next: ArticleInfo | null
}

interface ArticleNavigationLinkProps {
  article: ArticleInfo
  className?: string
  direction: "prev" | "next"
  label: string
  locale: string
}

function ArticleNavigationLink({
  article,
  className,
  direction,
  label,
  locale,
}: ArticleNavigationLinkProps) {
  const isNext = direction === "next"
  const ArrowIcon = isNext ? ArrowRight : ArrowLeft

  return (
    <a
      href={`/${locale}${articleUrl(article.slug)}`}
      className={cn(
        "group flex min-h-20 flex-col justify-center gap-2 py-5 transition-colors",
        "hover:bg-tech-main/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tech-main focus:outline-none",
        isNext && "sm:items-end sm:pl-8 sm:text-right",
        isNext ? "" : "sm:pr-8",
        className,
      )}>
      <span className="text-tech-main flex items-center gap-2 text-xs">
        <span>{label}</span>
        {article.isCrossFolder && article.chapterTitle ? (
          <>
            <Separator orientation="vertical" className="h-3" />
            <span>{article.chapterTitle}</span>
          </>
        ) : null}
      </span>

      <span className={cn("flex items-center gap-2", isNext && "sm:flex-row-reverse")}>
        <ArrowIcon
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-tech-main transition-transform",
            isNext ? "group-hover:translate-x-0.5" : "group-hover:-translate-x-0.5",
          )}
        />
        <span className="text-tech-main-dark line-clamp-2 text-base font-medium">
          {article.title}
        </span>
      </span>
    </a>
  )
}

export function ArticleNavigation({
  locale,
  nextLabel,
  prev,
  prevLabel,
  next,
}: ArticleNavigationProps) {
  return (
    <nav aria-label={`${prevLabel}, ${nextLabel}`} className="border-tech-line mt-16 border-t">
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2",
          prev && next && "divide-y divide-tech-line sm:divide-x sm:divide-y-0",
        )}>
        {prev && (
          <ArticleNavigationLink
            article={prev}
            direction="prev"
            label={prevLabel}
            locale={locale}
          />
        )}

        {next && (
          <ArticleNavigationLink
            article={next}
            className={prev ? undefined : "sm:col-start-2"}
            direction="next"
            label={nextLabel}
            locale={locale}
          />
        )}
      </div>
    </nav>
  )
}
