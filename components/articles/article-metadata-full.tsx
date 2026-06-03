"use client"

import { formatAbsoluteTime, formatRelativeTime } from "@/lib/format-time"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useRouter } from "@/i18n/navigation"
import { useState, useCallback, useMemo } from "react"
import { ArticleMetadataLayout } from "@/components/articles/article-metadata-layout"
import { ArticleLicenseNotice } from "@/components/articles/article-license-notice"

interface ArticleMetadataFullProps {
  title: string
  author: string
  coAuthors?: string[]
  createdAt: string
  lastModified: string
  canonicalUrl: string
  filePath: string
  wordCount: number
  readingTime: number
  editPath: string
  isAdvanced?: boolean
  bannerPath?: string | null
  bannerAlt?: string
}

function getAvatarUrl(username: string) {
  return `https://github.com/${username}.png`
}

const DEFAULT_CO_AUTHORS: string[] = []

export function ArticleMetadataFull({
  title,
  author,
  coAuthors = DEFAULT_CO_AUTHORS,
  createdAt,
  lastModified,
  canonicalUrl,
  filePath,
  wordCount,
  readingTime,
  editPath,
  isAdvanced,
  bannerPath,
  bannerAlt,
}: ArticleMetadataFullProps) {
  const t = useTranslations("ArticleMeta")
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)

  const allContributors = [author, ...coAuthors]
  const displayContributors = allContributors.slice(0, 5)
  const remainingCount = allContributors.length - 5

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }, [canonicalUrl])

  const handleEditClick = useCallback(() => {
    router.push(`/draft/new?file=${encodeURIComponent(editPath)}`)
  }, [router, editPath])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => !current)
  }, [])

  const allAuthors = useMemo(
    () => [author, ...coAuthors],
    [author, coAuthors]
  )

  const collapseButton = useMemo(
    () => (
      <button
        type="button"
        onClick={toggleCollapsed}
        className="
          group relative inline-flex cursor-pointer items-center justify-center
          text-tech-main/65 transition-colors after:absolute after:-inset-2.5
          after:content-[''] hover:text-tech-main focus-visible:outline-tech-main
          focus-visible:outline-2 focus-visible:outline-offset-2
        "
        aria-label={
          isCollapsed ? t("expandMetadata") : t("collapseMetadata")
        }>
        <span
          className="
            border guide-line bg-surface-overlay px-1.5 py-0.5 text-[0.625rem]
            leading-none transition-colors group-hover:bg-tech-accent/10
          ">
          {isCollapsed ? "[+]" : "[-]"}
        </span>
      </button>
    ),
    [toggleCollapsed, isCollapsed, t]
  )

  return (
    <ArticleMetadataLayout
      title={title}
      filePath={filePath}
      isAdvanced={isAdvanced}
      bannerPath={bannerPath}
      bannerAlt={bannerAlt}
      pathLabel={t("pathLabel")}
      headerActions={collapseButton}>
      <div className="flex flex-col">
        <div
          className={`
            items-center gap-x-3 gap-y-1 text-[0.6875rem] text-tech-main/65
            transition-opacity duration-200 sm:text-xs
            ${isCollapsed ? "flex flex-wrap opacity-100" : "hidden opacity-0"}
          `}>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 bg-tech-main/40" />
            <Link
              href={`https://github.com/${author}`}
              target="_blank"
              className="text-tech-main underline decoration-tech-main/30 underline-offset-4">
              {author}
            </Link>
            {coAuthors.length > 0 && (
              <span className="text-tech-main/50">+{coAuthors.length}</span>
            )}
          </span>
          <span aria-hidden="true" className="text-tech-main/35">
            |
          </span>
          <span>
            {wordCount.toLocaleString()} / {readingTime} {t("minuteUnit")}
          </span>
        </div>

        <div
          aria-hidden={isCollapsed}
          inert={isCollapsed ? true : undefined}
          className={`
            grid transition-[grid-template-rows,opacity] duration-300 ease-out
            motion-reduce:transition-none
            ${
              isCollapsed
                ? "grid-rows-[0fr] opacity-0"
                : "grid-rows-[1fr] opacity-100"
            }
          `}>
          <div className="min-h-0 overflow-hidden">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div
                className="
                  flex flex-col items-start gap-3
                  sm:flex-row sm:items-center sm:justify-between
                ">
                <div className="flex flex-row items-center gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="
                        relative size-6 border guide-line
                        sm:size-10
                      ">
                      <Link
                        href={`https://github.com/${author}`}
                        target="_blank"
                        aria-label={author}
                        className="
                          relative inline-block size-6
                          sm:size-10
                        ">
                        <Image
                          src={getAvatarUrl(author)}
                          alt={author}
                          className="border guide-line"
                          fill
                          sizes="(max-width: 640px) 24px, 40px"
                        />
                      </Link>
                    </span>
                    <Link
                      href={`https://github.com/${author}`}
                      target="_blank"
                      className="text-xs text-tech-main underline">
                      {author}
                    </Link>
                  </span>

                  <span className="text-tech-main/60">&&</span>

                  {coAuthors.length > 0 && (
                    <span
                      className="
                        flex flex-col gap-3
                        sm:flex-row sm:items-center sm:gap-4
                      ">
                      <span className="flex items-center gap-1">
                        {displayContributors.slice(1).map((contributor) => (
                          <span
                            key={contributor}
                            className="
                              relative size-4 border guide-line
                              sm:size-6
                            ">
                            <Link
                              href={`https://github.com/${contributor}`}
                              target="_blank"
                              aria-label={contributor}
                              className="
                                relative inline-block size-4
                                sm:size-6
                              ">
                              <Image
                                src={getAvatarUrl(contributor)}
                                alt={contributor}
                                fill
                                title={contributor}
                                sizes="(max-width: 640px) 16px, 24px"
                              />
                            </Link>
                          </span>
                        ))}
                        {remainingCount > 0 && (
                          <span className="ml-1 text-tech-main/60">
                            +{remainingCount}
                          </span>
                        )}
                      </span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleEditClick}
                  className="
                    group relative inline-flex cursor-pointer items-center justify-center
                    text-tech-main transition-colors after:absolute after:-inset-2.5
                    after:content-[''] focus-visible:outline-tech-main
                    focus-visible:outline-2 focus-visible:outline-offset-2
                  ">
                  <span
                    className="
                      border border-tech-main/40 bg-tech-main/5 px-2.5 py-1
                      text-[0.6875rem] leading-none uppercase transition-colors
                      group-hover:bg-tech-main group-hover:text-white
                    ">
                    {t("editArticle")}
                  </span>
                </button>
              </div>

              <hr className="my-1 border-tech-main/40 sm:my-2" />

              <div className="text-tech-main/60">
                <p>
                  {t("created")}
                  <span className="text-tech-main">
                    <time dateTime={createdAt}>
                      {formatAbsoluteTime(createdAt, false)}
                    </time>
                  </span>
                  <br
                    className="
                      block
                      sm:hidden
                    "
                  />
                  <span
                    className="
                      hidden
                      sm:inline
                    ">
                    {" | "}
                  </span>
                  {t("lastEdited")}
                  <span className="text-tech-main">
                    <time dateTime={lastModified}>
                      {formatRelativeTime(lastModified)}
                    </time>
                  </span>
                  <br />

                  {t("wordCount")}
                  <span className="text-tech-main">
                    {wordCount.toLocaleString()}
                  </span>
                  <br
                    className="
                      block
                      sm:hidden
                    "
                  />
                  <span
                    className="
                      hidden
                      sm:inline
                    ">
                    {" | "}
                  </span>
                  {t("estReadTime")}
                  <span className="text-tech-main">
                    {readingTime} {t("minuteUnit")}
                  </span>
                </p>
              </div>

              <div className="flex flex-row items-center gap-2">
                <span className="text-tech-main/60">{t("urlLabel")}</span>
                <code
                  className="
                    truncate border guide-line bg-tech-accent/10 px-1.5 py-0.5
                  ">
                  {canonicalUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`
                    shrink-0 whitespace-nowrap border guide-line px-2 py-1
                    text-[0.6875rem] leading-none transition-colors
                    ${
                      copied
                        ? `bg-tech-main text-tech-bg`
                        : `
                          bg-surface-overlay
                          hover:bg-tech-accent/10
                        `
                    }
                  `}
                  aria-label={t("copyButton")}>
                  {copied ? "✓" : t("copyButton")}
                </button>
              </div>

              <ArticleLicenseNotice
                title={title}
                canonicalUrl={canonicalUrl}
                attributionDate={lastModified || createdAt}
                authors={allAuthors}
              />
            </div>
          </div>
        </div>
      </div>
    </ArticleMetadataLayout>
  )
}
