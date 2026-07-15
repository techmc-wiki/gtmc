"use client"

import { Link } from "@/i18n/navigation"
import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { formatAbsoluteTime } from "@/lib/format-time"

interface ArticleLicenseNoticeProps {
  title: string
  canonicalUrl: string
  attributionDate?: string
  authors?: string[]
}

const DEFAULT_AUTHORS: string[] = []

export function ArticleLicenseNotice({
  title,
  canonicalUrl,
  attributionDate,
  authors = DEFAULT_AUTHORS,
}: ArticleLicenseNoticeProps) {
  const t = useTranslations("ArticleMeta")
  const [isCopied, setIsCopied] = useState(false)
  const orderedAuthors = [...new Set(authors)]
  const sortedAuthors = [...orderedAuthors].toSorted((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" })
  )
  const formattedAttributionDate = attributionDate
    ? formatAbsoluteTime(attributionDate, false)
    : null
  const attributionDateLabel =
    formattedAttributionDate && formattedAttributionDate !== "Invalid Date"
      ? formattedAttributionDate
      : null
  const attributionAuthors =
    orderedAuthors.length > 7
      ? [orderedAuthors[0], orderedAuthors.at(-1), "et al."]
      : sortedAuthors
  const attributionLabel = [
    `“${title}” - Graduate Texts in Minecraft (${canonicalUrl})`,
    attributionAuthors.length > 0 ? attributionAuthors.join(", ") : null,
    attributionDateLabel,
    "CC BY-NC-SA 4.0",
  ]
    .filter(Boolean)
    .join(", ")
  const handleCopyAttribution = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(attributionLabel)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy attribution:", error)
    }
  }, [attributionLabel])

  return (
    <section
      aria-label={t("articleLicenseAria")}
      className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-tech-main/70">
      <span className="mono-label text-[0.625rem] text-tech-main/55">
        {t("reuseLicenseTitle")}
      </span>
      <span aria-hidden="true" className="text-tech-main/35">
        |
      </span>
      <Link
        href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-tech-main/30 underline-offset-4 transition-colors hover:text-tech-main-dark hover:decoration-tech-main-dark">
        CC BY-NC-SA 4.0
      </Link>
      <span aria-hidden="true" className="text-tech-main/35">
        |
      </span>
      <button
        type="button"
        onClick={handleCopyAttribution}
        className="underline decoration-dotted decoration-tech-main/30 underline-offset-4 transition-colors hover:text-tech-main-dark hover:decoration-tech-main-dark"
        aria-label={t("copySuggestedAttributionAria")}
        title={t("copySuggestedAttributionTitle")}>
        {isCopied ? t("copiedButton") : t("copyAttribution")}
      </button>
      <span className="sr-only" aria-live="polite">
        {isCopied ? t("copiedButton") : ""}
      </span>
    </section>
  )
}
