"use client"

import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/shadcn/badge"

interface StatusBadgeProps {
  status: string
}

/** Localized draft and pull-request status. */
export function DraftStatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("Status")
  let label = status
  let className = "border-green-500/40 bg-green-500/10 text-green-600"

  switch (status) {
    case "DRAFT":
      className = "border-tech-main/40 bg-tech-main/5 text-tech-main"
      label = t("draft")
      break
    case "CLOSED":
      className = "border-red-500/40 bg-red-500/10 text-red-600"
      label = t("closed")
      break
    case "ARCHIVED":
      className = "border-gray-500/40 bg-gray-500/10 text-gray-600"
      label = t("archived")
      break
    case "PENDING":
      className = "border-yellow-500/40 bg-yellow-500/10 text-yellow-700"
      label = t("draftPending")
      break
    case "SUBMITTED":
      className = "border-blue-500/40 bg-blue-500/10 text-blue-700"
      label = t("draftSubmitted")
      break
    case "MERGED":
      className = "border-green-500/40 bg-green-500/10 text-green-600"
      label = t("merged")
      break
  }

  return <Badge className={className}>[{label}]</Badge>
}
