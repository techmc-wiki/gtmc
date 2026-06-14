"use client"

import { CornerBrackets } from "@/components/ui/corner-brackets"
import { ArticleBanner } from "@/components/articles/article-banner"
import { getArticleAssetPublicUrl } from "@/lib/articles/asset-url"
import type { ReactNode } from "react"

interface ArticleMetadataLayoutProps {
  title: string
  filePath: string
  isAdvanced?: boolean
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
  bannerPath,
  bannerAlt,
  pathLabel = "PATH:",
  headerActions,
  children,
}: ArticleMetadataLayoutProps) {
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
            <span className="flex items-center gap-2 tracking-tech-wide uppercase">
              <span className="size-1.5 bg-tech-signal" />
              Graduate Texts in Minecraft
            </span>
            {isAdvanced && (
              <span
                className="
                  bg-tech-advanced px-1.5 py-0.5 font-mono text-[0.625rem]
                  font-bold tracking-widest text-white select-none
                ">
                ADVANCED
              </span>
            )}
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
