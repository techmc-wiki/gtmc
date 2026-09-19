"use client"

import { ChevronDown } from "lucide-react"
import { CopyButton } from "@/components/ui/copy-button"
import { IconButton } from "@/components/ui/icon-button"
import { Badge } from "@/components/ui/shadcn/badge"
import { Separator } from "@/components/ui/shadcn/separator"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/shadcn/avatar"

import { useCallback, useId, useMemo, useState, type ReactNode } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/cn"
import { ArticleBanner } from "@/components/articles/article-banner"
import { AdvancedMarker } from "@/components/articles/advanced-marker"
import { ArticleLicenseNotice } from "@/components/articles/article-license-notice"
import { getArticleAssetPublicUrl } from "@/lib/articles/url"
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/format-time"

import { useMounted } from "@/hooks/use-mounted"
interface ArticleMetadataLayoutProps {
  title: string
  filePath: string
  isAdvanced?: boolean
  isRevising?: boolean
  bannerPath?: string | null
  bannerAlt?: string
  pathLabel?: string
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
  children,
}: ArticleMetadataLayoutProps) {
  const t = useTranslations("ArticleMeta")

  return (
    <header>
      <div
        className="
          relative mb-5 border guide-line bg-surface-overlay/80 p-3
          font-mono text-xs text-tech-main
          sm:mb-6 sm:p-3
        ">
        <div className="hidden flex-wrap items-center gap-x-3 gap-y-2 text-tech-main/50 sm:flex">
          {isRevising ? (
            <span
              className="
                border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5
                font-mono text-xs font-bold tracking-widest
                text-amber-700 uppercase select-none
                dark:text-amber-300
              ">
              {t("underRevision")}
            </span>
          ) : null}
          <span className="inline-flex min-w-0 items-center gap-3">
            {pathLabel} {filePath}
          </span>
          {isAdvanced && <AdvancedMarker className="-ml-1" />}
        </div>

        <div className="flex flex-col gap-3 sm:mt-2 sm:gap-4">
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
  const t = useTranslations("ArticleMeta")

  return (
    <ArticleMetadataLayout
      title={title}
      filePath={filePath}
      isAdvanced={isAdvanced}
      isRevising={isRevising}
      bannerPath={bannerPath}
      bannerAlt={bannerAlt}
      pathLabel={t("pathLabel")}>
      <dl
        className="
          grid grid-cols-1 gap-y-2.5 text-xs
          md:grid-cols-[auto_minmax(0,1fr)] md:items-baseline md:gap-x-4
          md:gap-y-2
        ">
        <dt className="text-tech-main/55">{t("wordCount")}</dt>
        <dd className="text-tech-main">{wordCount.toLocaleString()}</dd>

        <dt className="text-tech-main/55">{t("estReadTime")}</dt>
        <dd className="text-tech-main">
          {readingTime} {t("minuteUnit")}
        </dd>

        <dt className="text-tech-main/55">{t("reuseLicenseTitle")}</dt>
        <dd>
          <ArticleLicenseNotice
            title={title}
            canonicalUrl={canonicalUrl}
            attributionDate={attributionDate}
          />
        </dd>
      </dl>
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
  isAdvanced?: boolean
  isRevising?: boolean
  bannerPath?: string | null
  bannerAlt?: string
}

function getAvatarUrl(username: string) {
  return `https://github.com/${username}.png`
}

/**
 * One contributor in the byline roster. The primary author is set apart by
 * weight alone; order and emphasis carry the hierarchy, so the roster stays a
 * single wrapping row that reads the same at two authors or twelve.
 */
function ContributorChip({
  handle,
  isPrimary,
}: {
  handle: string
  isPrimary: boolean
}) {
  return (
    <li>
      <Link
        href={`/authors/${encodeURIComponent(handle)}`}
        className="
          group/contributor flex min-h-11 items-center gap-1.5 py-0.5
          text-xs text-tech-main transition-colors
          hover:text-tech-main-dark sm:min-h-8
        ">
        <Avatar className="border guide-line size-5 shrink-0 sm:size-6">
          <AvatarImage asChild src={getAvatarUrl(handle)}>
            <Image
              src={getAvatarUrl(handle)}
              alt={handle}
              fill
              sizes="24px"
              loading="lazy"
              className="object-cover"
            />
          </AvatarImage>
          <AvatarFallback
            className="
              bg-transparent font-mono text-xs font-bold
              tracking-widest text-tech-main/50 uppercase
            ">
            {handle[0]}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "underline decoration-tech-main/30 underline-offset-4 group-hover/contributor:decoration-tech-main-dark",
            isPrimary && "font-medium text-tech-main-dark"
          )}>
          {handle}
        </span>
      </Link>
    </li>
  )
}

const DEFAULT_CO_AUTHORS: string[] = []

/** Signed-in-reader metadata: contributors, timestamps, and license. */
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
  isAdvanced,
  isRevising,
  bannerPath,
  bannerAlt,
}: ArticleMetadataFullProps) {
  const t = useTranslations("ArticleMeta")
  const [isCollapsed, setIsCollapsed] = useState(true)
  const detailsId = useId()
  // Prerender-safe timestamp: absolute date in server HTML ("now" would make
  // the segment dynamic under cacheComponents), upgraded to relative on mount.
  const isMounted = useMounted()
  const lastEditedLabel = isMounted
    ? formatRelativeTime(lastModified)
    : formatAbsoluteTime(lastModified, false)
  // Stable reference for the `authors` prop: recomputed only when the author
  // list changes. Deduplicated so a handle repeated across frontmatter and
  // co-author records yields one byline entry.
  const allContributors = useMemo(
    () => [...new Set([author, ...coAuthors])],
    [author, coAuthors]
  )

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => !current)
  }, [])

  const collapseButton = useMemo(
    () => (
      <IconButton
        type="button"
        className="md:size-8"
        onClick={toggleCollapsed}
        aria-expanded={!isCollapsed}
        aria-controls={detailsId}
        aria-label={
          isCollapsed ? t("expandMetadata") : t("collapseMetadata")
        }
        label={isCollapsed ? t("expandMetadata") : t("collapseMetadata")}>
        <span className="t-acc-chevron" aria-hidden="true">
          <ChevronDown className="size-4" />
        </span>
      </IconButton>
    ),
    [toggleCollapsed, isCollapsed, detailsId, t]
  )

  return (
    <ArticleMetadataLayout
      title={title}
      filePath={filePath}
      isAdvanced={isAdvanced}
      isRevising={isRevising}
      bannerPath={bannerPath}
      bannerAlt={bannerAlt}
      pathLabel={t("pathLabel")}>
      <div className="t-acc flex flex-col" data-open={!isCollapsed}>
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tech-main/65">
            <span className="inline-flex items-center gap-1.5">
              <Link
                href={`/authors/${encodeURIComponent(author)}`}
                className="text-tech-main underline decoration-tech-main/30 underline-offset-4">
                {author}
              </Link>
              {coAuthors.length > 0 && (
                <Badge variant="ghost" className="px-0 text-tech-main/50">
                  +{coAuthors.length}
                </Badge>
              )}
            </span>
            <Separator
              orientation="vertical"
              className="bg-tech-main/35 h-3"
            />
            <span>
              {t("wordCount")} {wordCount.toLocaleString()}
            </span>
            <Separator
              orientation="vertical"
              className="bg-tech-main/35 h-3"
            />
            <span>
              {t("estReadTime")} {readingTime} {t("minuteUnit")}
            </span>
            <Separator
              orientation="vertical"
              className="bg-tech-main/35 h-3"
            />
            <span>
              {t("lastEdited")} {lastEditedLabel}
            </span>
          </div>
          {collapseButton}
        </div>

        <div
          id={detailsId}
          aria-hidden={isCollapsed}
          inert={isCollapsed ? true : undefined}
          className="t-acc-panel">
          <div className="t-acc-panel-inner min-h-0">
            <div className="mt-3 border-t guide-line pt-3">
              <dl
                className="
                  grid grid-cols-1 gap-y-2.5 text-xs
                  md:grid-cols-[auto_minmax(0,1fr)] md:items-baseline md:gap-x-4
                  md:gap-y-2
                ">
                <dt className="text-tech-main/55">
                  {t("contributorsLabel")}
                </dt>
                <dd>
                  <ul className="flex flex-wrap items-center gap-x-4">
                    {allContributors.map((contributor, index) => (
                      <ContributorChip
                        key={contributor}
                        handle={contributor}
                        isPrimary={index === 0}
                      />
                    ))}
                  </ul>
                </dd>

                <dt className="text-tech-main/55">{t("created")}</dt>
                <dd className="text-tech-main">
                  <time dateTime={createdAt}>
                    {formatAbsoluteTime(createdAt, false)}
                  </time>
                </dd>

                <dt className="text-tech-main/55">{t("lastEdited")}</dt>
                <dd className="text-tech-main">
                  <time dateTime={lastModified}>
                    {formatAbsoluteTime(lastModified, false)}
                  </time>
                </dd>

                <dt className="text-tech-main/55">{t("urlLabel")}</dt>
                <dd className="flex min-w-0 items-center gap-2">
                  <code
                    className="
                      min-w-0 flex-1 truncate border guide-line
                      bg-tech-accent/10 px-1.5 py-0.5
                    ">
                    {canonicalUrl}
                  </code>
                  <CopyButton
                    getValue={() => canonicalUrl}
                    label={t("copyButton")}
                    copiedLabel={t("copiedButton")}
                    failedLabel={t("copyFailed")}
                  />
                </dd>

                <dt className="text-tech-main/55">
                  {t("reuseLicenseTitle")}
                </dt>
                <dd>
                  <ArticleLicenseNotice
                    title={title}
                    canonicalUrl={canonicalUrl}
                    attributionDate={lastModified || createdAt}
                    authors={allContributors}
                  />
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </ArticleMetadataLayout>
  )
}
