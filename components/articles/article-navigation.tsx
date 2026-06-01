import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { articleUrl } from "@/lib/articles/url"
import { CornerBrackets } from "../ui/corner-brackets"

interface ArticleInfo {
  slug: string
  title: string
  isCrossFolder: boolean
  chapterTitle?: string
}

interface ArticleNavigationProps {
  prev: ArticleInfo | null
  next: ArticleInfo | null
}

interface ArticleNavigationLinkProps {
  article: ArticleInfo
  className?: string
  direction: "prev" | "next"
  label: string
}

function ArticleNavigationLink({
  article,
  className = "",
  direction,
  label,
}: ArticleNavigationLinkProps) {
  const isNext = direction === "next"
  const arrow = isNext ? "→" : "←"

  return (
    <Link
      href={articleUrl(article.slug)}
      className={`
        group relative flex min-h-24 w-full flex-col justify-between
        overflow-hidden border border-tech-main/30 bg-surface/55 p-4
        transition-colors
        hover:border-tech-main/60 hover:bg-tech-main/5
        focus-visible:outline-tech-main focus-visible:outline-2
        focus-visible:outline-offset-2 focus:outline-none
        ${isNext ? "md:items-end md:text-right" : ""}
        ${className}
      `}>
      <span
        aria-hidden="true"
        className={`
          pointer-events-none absolute top-0 h-px w-20 bg-tech-main/30
          transition-colors group-hover:bg-tech-main/60
          ${isNext ? "right-4" : "left-4"}
        `}
      />
      <CornerBrackets
        size="size-2"
        color="border-tech-main/35"
        variant="hover-only"
      />

      <div
        className={`
          flex flex-wrap items-center gap-x-2 gap-y-1 font-mono
          text-[0.625rem] tracking-[0.16em] text-tech-main/60 uppercase
          ${isNext ? "md:justify-end" : ""}
        `}>
        <span>{label}</span>
        {article.isCrossFolder && article.chapterTitle && (
          <span className="border border-tech-main/25 px-1.5 py-0.5 text-tech-main/45">
            {article.chapterTitle}
          </span>
        )}
      </div>

      <div
        className={`
          mt-4 flex items-end gap-3
          ${isNext ? "md:flex-row-reverse" : ""}
        `}>
        <span
          aria-hidden="true"
          className="
            flex size-6 shrink-0 items-center justify-center border
            border-tech-main/30 bg-tech-bg/60 font-mono text-[0.75rem]
            leading-none text-tech-main transition-colors
            group-hover:border-tech-main/60 group-hover:bg-tech-main/10
          ">
          {arrow}
        </span>
        <span className="line-clamp-2 text-sm font-medium text-tech-main-dark sm:text-base">
          {article.title}
        </span>
      </div>
    </Link>
  )
}

export async function ArticleNavigation({
  prev,
  next,
}: ArticleNavigationProps) {
  const t = await getTranslations("ArticleMeta")

  return (
    <nav
      aria-label={`${t("prev")} / ${t("next")}`}
      className="relative mt-14 border-t border-tech-main/25 pt-6">
      <span
        aria-hidden="true"
        className="absolute -top-px left-0 h-px w-28 bg-tech-main/60"
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {prev && (
          <ArticleNavigationLink
            article={prev}
            direction="prev"
            label={t("prev")}
          />
        )}

        {next && (
          <ArticleNavigationLink
            article={next}
            className={prev ? "" : "md:col-start-2"}
            direction="next"
            label={t("next")}
          />
        )}
      </div>
    </nav>
  )
}
