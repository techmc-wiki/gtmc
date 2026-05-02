"use client"

import { ArticleMetadataShell } from "@/components/articles/article-metadata-shell"
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
    <ArticleMetadataShell
      title={title}
      filePath={filePath}
      isAdvanced={isAdvanced}
      bannerPath={bannerPath}
      bannerAlt={bannerAlt}
      pathLabel="PATH:">
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
    </ArticleMetadataShell>
  )
}
