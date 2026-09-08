"use client"

import type { ComponentProps } from "react"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/shadcn/badge"

interface StatusBadgeProps {
  status: string
}

/** Localized draft and pull-request status. */
export function DraftStatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("Status")
  let label = status
  let variant: ComponentProps<typeof Badge>["variant"] = "neutral"

  switch (status) {
    case "DRAFT":
      variant = "neutral"
      label = t("draft")
      break
    case "CLOSED":
      variant = "destructive"
      label = t("closed")
      break
    case "ARCHIVED":
      variant = "neutral"
      label = t("archived")
      break
    case "PENDING":
      variant = "pending"
      label = t("draftPending")
      break
    case "SUBMITTED":
      variant = "in-progress"
      label = t("draftSubmitted")
      break
    case "MERGED":
      variant = "success"
      label = t("merged")
      break
  }

  return <Badge variant={variant}>{label}</Badge>
}
