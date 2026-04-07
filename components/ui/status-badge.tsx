"use client"

import { useTranslations } from "next-intl"

interface StatusBadgeProps {
  status: string
}

export function FeatureStatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("Status")
  let styles = "shrink-0 border px-2 py-0.5 font-mono text-xs tracking-wider"
  let label = t("pending")

  switch (status) {
    case "PENDING":
      styles += " border-yellow-500/40 text-yellow-600 bg-yellow-500/10"
      label = t("pending")
      break
    case "IN_PROGRESS":
      styles += " border-blue-500/40 text-blue-600 bg-blue-500/10"
      label = t("inProgress")
      break
    case "RESOLVED":
      styles += " border-green-500/40 text-green-600 bg-green-500/10"
      label = t("resolved")
      break
    default:
      styles += " border-gray-500/40 text-gray-600 bg-gray-500/10"
  }

  return <span className={styles}>[{label}]</span>
}

export function DraftStatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("Status")
  let styles = "shrink-0 border px-2 py-0.5 font-mono text-xs tracking-wider"
  let label = status

  switch (status) {
    case "DRAFT":
      styles += " border-tech-main/40 bg-tech-main/5 text-tech-main"
      label = t("draft")
      break
    case "IN_REVIEW":
      styles += " border-blue-500/40 bg-blue-500/10 text-blue-600"
      label = t("inReview")
      break
    case "SYNC_CONFLICT":
      styles += " border-amber-500/40 bg-amber-500/10 text-amber-700"
      label = t("syncConflict")
      break
    case "REJECTED":
    case "CLOSED":
      styles += " border-red-500/40 bg-red-500/10 text-red-600"
      label = status === "REJECTED" ? t("rejected") : t("closed")
      break
    case "ARCHIVED":
      styles += " border-gray-500/40 bg-gray-500/10 text-gray-600"
      label = t("archived")
      break
    default:
      styles += " border-green-500/40 bg-green-500/10 text-green-600"
  }

  return <span className={styles}>[{label}]</span>
}
