"use client"

import { CornerBrackets } from "@/components/ui/corner-brackets"
import { ArticleBanner } from "@/components/articles/article-banner"
import { ArticleLicenseNotice } from "@/components/articles/article-license-notice"

interface ArticleMetadataSimpleProps {
  title: string
  canonicalUrl: string
  attributionDate?: string
  filePath: string
  wordCount: number
  readingTime: number
  isAdvanced?: boolean
  bannerPath?: string | null
  bannerAlt?: string
}

export function ArticleMetadataSimple({
  title,
  canonicalUrl,
  attributionDate,
  filePath,
  wordCount,
  readingTime,
  isAdvanced,
  bannerPath,
  bannerAlt,
}: ArticleMetadataSimpleProps) {
  return (
    <header>
      <CornerBrackets />

      <div
        className="
          relative mb-8 animate-fade-in border guide-line bg-white/80 p-4
          font-mono text-xs text-tech-main
        ">
        <div className="flex items-center justify-between text-tech-main/50">
          <span className="flex items-center gap-2">
            <span className="size-2 animate-pulse bg-tech-main/50" />
            SYS.READ_STREAM | UTF-8
          </span>
          <span
            className="
              hidden items-center gap-3
              sm:inline-flex
            ">
            PATH: {filePath}
          </span>
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

          <div className="text-tech-main/60">
            <p>
              {"WORD_COUNT: "}
              <span className="text-tech-main">
                {wordCount.toLocaleString()}
              </span>
              <span
                className="
                  hidden
                  sm:inline
                ">
                {" "}
                |{" "}
              </span>
              <br
                className="
                  block
                  sm:hidden
                "
              />
              {"EST_READ_TIME: "}
              <span className="text-tech-main">{readingTime} MIN</span>
            </p>
          </div>

          <ArticleLicenseNotice
            title={title}
            canonicalUrl={canonicalUrl}
            attributionDate={attributionDate}
          />
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
