"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/cn"

interface TechBadgeProps {
  children: React.ReactNode
  className?: string
}

export function TechBadge({ children, className }: TechBadgeProps) {
  return (
    <span
      className={cn(
        "shrink-0 border px-2 py-0.5 font-mono text-xs tracking-wider",
        className
      )}>
      {children}
    </span>
  )
}

interface StatusBadgeProps {
  status: string
}

export function FeatureStatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("Status")
  let label = t("pending")
  let className = "border-gray-500/40 bg-gray-500/10 text-gray-600"

  switch (status) {
    case "PENDING":
      className = "border-yellow-500/40 text-yellow-600 bg-yellow-500/10"
      label = t("pending")
      break
    case "IN_PROGRESS":
      className = "border-blue-500/40 text-blue-600 bg-blue-500/10"
      label = t("inProgress")
      break
    case "RESOLVED":
      className = "border-green-500/40 text-green-600 bg-green-500/10"
      label = t("resolved")
      break
  }

  return <TechBadge className={className}>[{label}]</TechBadge>
}

export function DraftStatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("Status")
  let label = status
  let className = "border-green-500/40 bg-green-500/10 text-green-600"

  switch (status) {
    case "DRAFT":
      className = "border-tech-main/40 bg-tech-main/5 text-tech-main"
      label = t("draft")
      break
    case "IN_REVIEW":
      className = "border-blue-500/40 bg-blue-500/10 text-blue-600"
      label = t("inReview")
      break
    case "SYNC_CONFLICT":
      className = "border-amber-500/40 bg-amber-500/10 text-amber-700"
      label = t("syncConflict")
      break
    case "REJECTED":
    case "CLOSED":
      className = "border-red-500/40 bg-red-500/10 text-red-600"
      label = status === "REJECTED" ? t("rejected") : t("closed")
      break
    case "ARCHIVED":
      className = "border-gray-500/40 bg-gray-500/10 text-gray-600"
      label = t("archived")
      break
  }

  return <TechBadge className={className}>[{label}]</TechBadge>
}

interface ReviewStatusBadgeProps {
  variant:
    | "pr"
    | "conflict"
    | "conflict-mode-fine-grained"
    | "conflict-mode-simple"
  prNumber?: number
}

export function ReviewStatusBadge({
  variant,
  prNumber,
}: ReviewStatusBadgeProps) {
  const t = useTranslations("Review")

  switch (variant) {
    case "pr":
      return (
        <TechBadge className="border-blue-500/40 bg-blue-500/10 text-blue-600">
          [PR #{prNumber}]
        </TechBadge>
      )
    case "conflict":
      return (
        <TechBadge className="animate-pulse border-red-500/40 bg-red-500 text-white">
          {t("unresolvedConflicts")}
        </TechBadge>
      )
    case "conflict-mode-fine-grained":
      return (
        <TechBadge className="border-blue-500/30 bg-blue-500/10 text-blue-700">
          {t("modeFineGrained")}
        </TechBadge>
      )
    case "conflict-mode-simple":
      return (
        <TechBadge className="border-tech-main/30 bg-tech-main/10 text-tech-main">
          SIMPLE
        </TechBadge>
      )
    default:
      return null
  }
}
