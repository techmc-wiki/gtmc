"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { ArticleBanner } from "@/components/articles/article-banner"
import { ArticleLicenseNotice } from "@/components/articles/article-license-notice"
import { getArticleAssetPublicUrl } from "@/lib/articles/url"
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/format-time"

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

/** Shared article metadata frame: imprint strip + banner. */
function ArticleMetadataLayout({
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

      <div
        className="
          relative mb-5 animate-fade-in border guide-line bg-surface-overlay/80 p-3
          font-mono text-xs text-tech-main
          sm:mb-6 sm:p-3
        ">
        <div
          className="
            flex flex-wrap items-center gap-x-3 gap-y-2 text-tech-main/50
          ">
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
          <span
            className="
              hidden min-w-0 items-center gap-3
              sm:inline-flex
            ">
            {pathLabel} {filePath}
          </span>
          {headerActions && <span className="ml-auto">{headerActions}</span>}
        </div>

        <div className="mt-2 flex flex-col gap-3 sm:gap-4">
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

interface ArticleMetadataAnonymousProps {
  title: string
  canonicalUrl: string
  attributionDate?: string
  filePath: string
  wordCount: number
  readingTime: number
  isAdvanced?: boolean
  isRevising?: boolean
  bannerPath?: string | null
  bannerAlt?: string
}

/** Anonymous-reader metadata: word count, reading time, and license. */
export function ArticleMetadataAnonymous({
  title,
  canonicalUrl,
  attributionDate,
  filePath,
  wordCount,
  readingTime,
  isAdvanced,
  isRevising,
  bannerPath,
  bannerAlt,
}: ArticleMetadataAnonymousProps) {
  return (
    <ArticleMetadataLayout
      title={title}
      filePath={filePath}
      isAdvanced={isAdvanced}
      isRevising={isRevising}
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
    </ArticleMetadataLayout>
  )
}

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
  isRevising?: boolean
  bannerPath?: string | null
  bannerAlt?: string
}

function getAvatarUrl(username: string) {
  return `https://github.com/${username}.png`
}

function AuthorAvatar({
  username,
  sizes,
  imageSizes,
  title,
}: {
  username: string
  sizes: string
  imageSizes: string
  title?: string
}) {
  const href = `/authors/${encodeURIComponent(username)}`

  return (
    <span className={`relative border guide-line ${sizes}`}>
      <Link
        href={href}
        aria-label={username}
        className={`relative inline-block ${sizes}`}>
        <Image
          src={getAvatarUrl(username)}
          alt={username}
          className="border guide-line"
          fill
          title={title}
          sizes={imageSizes}
        />
      </Link>
    </span>
  )
}

const DEFAULT_CO_AUTHORS: string[] = []

/** Signed-in-reader metadata: contributors, timestamps, edit + copy controls. */
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
  isRevising,
  bannerPath,
  bannerAlt,
}: ArticleMetadataFullProps) {
  const t = useTranslations("ArticleMeta")
  const [copied, setCopied] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  // Prerender-safe timestamp: absolute date in server HTML ("now" would make
  // the segment dynamic under cacheComponents), upgraded to relative on mount.
  const [lastEditedLabel, setLastEditedLabel] = useState(() =>
    formatAbsoluteTime(lastModified, false)
  )

  useEffect(() => {
    setLastEditedLabel(formatRelativeTime(lastModified))
  }, [lastModified])

  // Stable reference for the `authors` prop: recomputed only when author list changes
  const allContributors = useMemo(() => [author, ...coAuthors], [author, coAuthors])
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

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => !current)
  }, [])

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
      isRevising={isRevising}
      bannerPath={bannerPath}
      bannerAlt={bannerAlt}
      pathLabel={t("pathLabel")}
      headerActions={collapseButton}>
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-tech-main/65 sm:text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 bg-tech-main/40" />
            <Link
              href={`/authors/${encodeURIComponent(author)}`}
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
          <span aria-hidden="true" className="text-tech-main/35">
            |
          </span>
          <span>
            {t("lastEdited")} {lastEditedLabel}
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
            <div className="mt-3 flex flex-col gap-3 border-t guide-line pt-3 sm:gap-4">
              <div
                className="
                  flex flex-col items-start gap-3
                  sm:flex-row sm:items-center sm:justify-between
                ">
                <div className="flex flex-row items-center gap-2">
                  <span className="flex items-center gap-2">
                    <AuthorAvatar
                      username={author}
                      sizes="size-6 sm:size-10"
                      imageSizes="(max-width: 640px) 24px, 40px"
                    />
                    <Link
                      href={`/authors/${encodeURIComponent(author)}`}
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
                          <AuthorAvatar
                            key={contributor}
                            username={contributor}
                            sizes="size-4 sm:size-6"
                            imageSizes="(max-width: 640px) 16px, 24px"
                            title={contributor}
                          />
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

                <Link
                  href={`/draft/new?file=${encodeURIComponent(editPath)}`}
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
                </Link>
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
                      {formatAbsoluteTime(lastModified, false)}
                    </time>
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
                authors={allContributors}
              />

            </div>
          </div>
        </div>
      </div>
    </ArticleMetadataLayout>
  )
}
