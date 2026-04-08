import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { articleUrl } from "@/lib/article-url"
import { CornerBrackets } from "./ui/corner-brackets"

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

export async function ArticleNavigation({
  prev,
  next,
}: ArticleNavigationProps) {
  const t = await getTranslations("ArticleMeta")

  return (
    <nav className="relative mt-12 border-t guide-line pt-8">
      <CornerBrackets size="size-3" color="border-tech-main/30" />

      <div
        className="
          grid grid-cols-1 gap-4
          md:grid-cols-2 md:gap-6
        ">
        {prev ? (
          <Link
            href={articleUrl(prev.slug)}
            className="
              group relative flex min-h-[44px] w-full flex-col gap-2 border
              border-tech-main/40 bg-tech-bg p-4 transition-colors
              hover:border-tech-main hover:bg-tech-accent/10
            ">
            <div
              className="
                flex items-center gap-2 font-mono text-xs text-tech-main/60
              ">
              <span>←</span>
              <span>{t("prev")}</span>
              {prev.isCrossFolder && (
                <span
                  className="
                    rounded-sm border border-tech-main/40 px-1.5 py-0.5
                    text-[0.625rem]
                  ">
                  ↗
                </span>
              )}
              {prev.isCrossFolder && prev.chapterTitle && (
                <span className="text-tech-main/40">{prev.chapterTitle}</span>
              )}
            </div>
            <div className="line-clamp-2 font-mono text-sm text-tech-main">
              {prev.title}
            </div>
          </Link>
        ) : (
          <div
            className="
              pointer-events-none flex min-h-[44px] w-full flex-col gap-2 border
              guide-line bg-tech-bg p-4 opacity-50
            ">
            <div
              className="
                flex items-center gap-2 font-mono text-xs text-tech-main/40
              ">
              <span>←</span>
              <span>{t("prev")}</span>
            </div>
            <div className="font-mono text-sm text-tech-main/40">
              {t("noPrevArticle")}
            </div>
          </div>
        )}

        {next ? (
          <Link
            href={articleUrl(next.slug)}
            className="
              group relative flex min-h-[44px] w-full flex-col gap-2 border
              border-tech-main/40 bg-tech-bg p-4 transition-colors
              hover:border-tech-main hover:bg-tech-accent/10
              md:items-end md:text-right
            ">
            <div
              className="
                flex items-center gap-2 font-mono text-xs text-tech-main/60
              ">
              {next.isCrossFolder && (
                <span
                  className="
                    rounded-sm border border-tech-main/40 px-1.5 py-0.5
                    text-[0.625rem]
                  ">
                  ↗
                </span>
              )}
              <span>{t("next")}</span>
              <span>→</span>
              {next.isCrossFolder && next.chapterTitle && (
                <span className="text-tech-main/40">{next.chapterTitle}</span>
              )}
            </div>
            <div className="line-clamp-2 font-mono text-sm text-tech-main">
              {next.title}
            </div>
          </Link>
        ) : (
          <div
            className="
              pointer-events-none flex min-h-[44px] w-full flex-col gap-2 border
              guide-line bg-tech-bg p-4 opacity-50
              md:items-end md:text-right
            ">
            <div
              className="
                flex items-center gap-2 font-mono text-xs text-tech-main/40
              ">
              <span>{t("next")}</span>
              <span>→</span>
            </div>
            <div className="font-mono text-sm text-tech-main/40">
              {t("noNextArticle")}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
