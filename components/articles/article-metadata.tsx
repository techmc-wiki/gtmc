"use client"

import { formatAbsoluteTime, formatRelativeTime } from "@/lib/format-time"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { ArticleBanner } from "@/components/articles/article-banner"
import { ArticleLicenseNotice } from "@/components/articles/article-license-notice"

function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error("Error reading localStorage:", error)
      return initialValue
    }
  })

  const setValue = (value: T) => {
    try {
      setStoredValue(value)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    } catch (error) {
      console.error("Error writing localStorage:", error)
    }
  }

  return [storedValue, setValue]
}

interface ArticleMetadataProps {
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

export function ArticleMetadata({
  title,
  author,
  coAuthors = [],
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
}: ArticleMetadataProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const storageKey = "article-metadata-collapsed"
  const [isCollapsed, setIsCollapsed] = useLocalStorage(storageKey, false)

  const getAvatarUrl = (username: string) => {
    return `https://github.com/${username}.png`
  }

  const allContributors = [author, ...coAuthors]
  const displayContributors = allContributors.slice(0, 5)
  const remainingCount = allContributors.length - 5

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

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
            PATH: {filePath}
          </span>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="
              cursor-pointer border guide-line bg-white px-2 py-0.5
              transition-colors
              hover:bg-tech-accent/10
            "
            aria-label={isCollapsed ? "Expand metadata" : "Collapse metadata"}>
            {isCollapsed ? "[+]" : "[-]"}
          </button>
        </div>

        <div
          className={`
            flex flex-col gap-4 transition-all duration-500 ease-in-out
            ${
              isCollapsed
                ? "max-h-0 overflow-hidden opacity-0"
                : `mt-4 max-h-screen opacity-100`
            }
          `}>
          <div
            className="
              flex flex-col gap-4
              sm:flex-row sm:items-center sm:justify-between
            ">
            <div className="flex flex-row items-center gap-2">
              {/* Primary Author */}
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

              {/* Co-Authors */}
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
              onClick={() =>
                router.push(`/draft/new?file=${encodeURIComponent(editPath)}`)
              }
              className="
                cursor-pointer items-center overflow-hidden border
                border-tech-main/40 bg-tech-main/5 px-3 py-2 text-tech-main
                uppercase transition-all duration-300
                hover:bg-tech-main hover:text-white
              ">
              [EDIT_ARTICLE]
            </button>
          </div>

          <hr className="my-2 border-tech-main/40" />

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
            {/* Edit History */}
            <p>
              {"CREATED: "}
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
              {"LAST_EDITED: "}
              <span className="text-tech-main">
                <time dateTime={lastModified}>
                  {formatRelativeTime(lastModified)}
                </time>
              </span>
              <br />

              {/* Reading Stats */}
              {"WORD_COUNT: "}
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
              {"EST_READ_TIME: "}
              <span className="text-tech-main">{readingTime} MIN</span>
            </p>
          </div>

          <div className="flex flex-row items-center gap-2">
            <span className="text-tech-main/60">URL:</span>
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
                border guide-line px-2 py-0.5 transition-colors
                ${
                  copied
                    ? `bg-tech-main text-tech-bg`
                    : `
                      bg-white
                      hover:bg-tech-accent/10
                    `
                }
              `}
              aria-label="Copy URL">
              {copied ? "✓" : "Copy"}
            </button>
          </div>

          <ArticleLicenseNotice
            title={title}
            canonicalUrl={canonicalUrl}
            attributionDate={lastModified || createdAt}
            authors={[author, ...coAuthors]}
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
