"use client"

import { CornerBrackets } from "@/components/ui/corner-brackets"
import { ArticleBanner } from "@/components/articles/article-banner"
import { ReactNode } from "react"

interface ArticleMetadataShellProps {
  title: string
  filePath: string
  isAdvanced?: boolean
  bannerPath?: string | null
  bannerAlt?: string
  pathLabel?: string
  headerActions?: ReactNode
  children: ReactNode
}

export function ArticleMetadataShell({
  title,
  filePath,
  isAdvanced,
  bannerPath,
  bannerAlt,
  pathLabel = "PATH:",
  headerActions,
  children,
}: ArticleMetadataShellProps) {
  return (
    <header>
      <CornerBrackets />

      <div
        className="
          relative mb-8 animate-fade-in border guide-line bg-white/80 p-4
          font-mono text-xs text-tech-main
          sm:p-6
        ">
        <div
          className="
            flex flex-wrap items-center justify-between text-tech-main/50
          ">
          <span className="flex items-center gap-2">
            <span className="size-2 animate-pulse bg-tech-main/50" />
            SYS.READ_STREAM | UTF-8
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

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              className="
                font-mono text-xl font-bold tracking-tight text-tech-main-dark
                sm:text-2xl
              ">
              {title}
            </h1>
            {isAdvanced && (
              <span
                className="
                  mx-2 shrink-0 bg-[#4c5b96] px-1.5 py-0.5 font-mono text-[0.625rem]
                  font-bold tracking-widest text-white select-none
                ">
                ADVANCED
              </span>
            )}
          </div>

          {children}
        </div>
      </div>

      {bannerPath && (
        <ArticleBanner
          src={`/api/assets/banner/${bannerPath}`}
          alt={bannerAlt || title}
        />
      )}
    </header>
  )
}
