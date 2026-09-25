"use client"

import { CopyButton } from "@/components/ui/copy-button"

import { Link } from "@/i18n/navigation"
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

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Link
        href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
        target="_blank"
        rel="noopener noreferrer"
        className="
          underline decoration-tech-main/30 underline-offset-4
          transition-colors hover:text-tech-main-dark
          hover:decoration-tech-main-dark
        ">
        CC BY-NC-SA 4.0
      </Link>
      <CopyButton
        getValue={() => attributionLabel}
        label={t("copySuggestedAttributionAria")}
        copiedLabel={t("copiedButton")}
        failedLabel={t("copyFailed")}
      />
    </span>
  )
}
