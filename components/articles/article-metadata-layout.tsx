"use client"

import { CornerBrackets } from "@/components/ui/corner-brackets"
import { ArticleBanner } from "@/components/articles/article-banner"
import { getArticleAssetPublicUrl } from "@/lib/articles/asset-url"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

interface ArticleMetadataLayoutProps {
  title: string
  filePath: string
  isAdvanced?: boolean
  isRevising?: boolean
  bannerPath?: string | null
  bannerAlt?: string
  pathLabel?: string
  headerActions?: ReactNode
  children: ReactNode
}

export function ArticleMetadataLayout({
  title,
  filePath,
  isAdvanced,
  isRevising,
  bannerPath,
  bannerAlt,
  pathLabel = "PATH:",
  headerActions,
  children,
}: ArticleMetadataLayoutProps) {
  const t = useTranslations("ArticleMeta")

  return (
    <header>
      <CornerBrackets />

      <div
        className="
          relative mb-5 animate-fade-in border guide-line bg-surface-overlay/80 p-3
          font-mono text-xs text-tech-main
          sm:mb-6 sm:p-4
        ">
        <div
          className="
            flex flex-wrap items-center justify-between text-tech-main/50
          ">
          <span className="flex flex-wrap items-center gap-2">
            {isAdvanced && (
              <span
                className="
                  bg-tech-advanced px-1.5 py-0.5 font-mono text-[0.625rem]
                  font-bold tracking-widest text-white select-none
                ">
                ADVANCED
              </span>
            )}
            {isRevising ? (
              <span
                className="
                  border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5
                  font-mono text-[0.625rem] font-bold tracking-widest
                  text-amber-700 uppercase select-none
                  dark:text-amber-300
                ">
                {t("underRevision")}
              </span>
            ) : null}
          </span>
          <span
            className="
              hidden items-center gap-3
              sm:inline-flex
            ">
            {pathLabel} {filePath}
          </span>
          {headerActions}
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:gap-4">
          {children}
        </div>
      </div>

      {bannerPath && (
        <ArticleBanner
          src={getArticleAssetPublicUrl(bannerPath)}
          alt={bannerAlt || title}
        />
      )}
    </header>
  )
}
