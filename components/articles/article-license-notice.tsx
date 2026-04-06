"use client"

import { Link } from "@/i18n/navigation"
import { useState } from "react"
import { formatAbsoluteTime } from "@/lib/format-time"

interface ArticleLicenseNoticeProps {
  title: string
  canonicalUrl: string
  attributionDate?: string
  authors?: string[]
}

export function ArticleLicenseNotice({
  title,
  canonicalUrl,
  attributionDate,
  authors = [],
}: ArticleLicenseNoticeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const orderedAuthors = [...new Set(authors)]
  const sortedAuthors = [...orderedAuthors].sort((left, right) =>
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
  const attributionPrompt =
    orderedAuthors.length > 7
      ? "Suggested attribution (truncated to initial author and latest editor):"
      : "Suggested attribution (authors listed in alphabetical order):"

  const handleCopyAttribution = async () => {
    try {
      await navigator.clipboard.writeText(attributionLabel)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy attribution:", error)
    }
  }

  return (
    <section
      aria-label="Article license"
      className="border-t guide-line pt-3 text-[0.6875rem] text-tech-main/70">
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left transition-colors hover:text-tech-main"
        aria-expanded={isExpanded}>
        <span className="mono-label">Reuse & License</span>
        <span className="font-mono text-[0.625rem] text-tech-main/55 uppercase">
          {isExpanded ? "[-] Hide" : "[+] Show"}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2 font-mono leading-relaxed">
          <p>
            This article is distributed under{" "}
            <Link
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-tech-main/30 underline-offset-4 transition-colors hover:text-tech-main-dark hover:decoration-tech-main-dark">
              CC BY-NC-SA 4.0
            </Link>
            . You may share and adapt it for non-commercial use with
            attribution and the same license.
          </p>
          <p>
            <button
              type="button"
              onClick={handleCopyAttribution}
              className={
                "bg-transparent p-0 text-left leading-tight"
              }
              aria-label="Copy suggested attribution"
              title="Click to copy suggested attribution">
              {attributionPrompt}{" "}
              <span
                className={`relative font-bold text-tech-main`}>
                <span className={`transition-opacity ${isCopied ? "opacity-0" : "opacity-100"}`}>{attributionLabel}</span>
                <span
                  aria-hidden="true"
                  className={
                    `pointer-events-none absolute top-0 left-0 transition-opacity ${isCopied ? "opacity-100" : "opacity-0"}`
                  }>
                  Copied!
                </span>
              </span>
            </button>
          </p>
          <p>
            Primary authors are shown above. Additional contribution history may
            also be reflected in the linked source records and repository
            history.
          </p>
        </div>
      )}
    </section>
  )
}
