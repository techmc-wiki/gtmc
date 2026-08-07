"use client"

import { useTranslations } from "next-intl"

import { cn } from "@/lib/cn"

interface TechBadgeProps {
  children: React.ReactNode
  className?: string
}

/** Bordered mono status chip, e.g. `[Pending]`. */
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

type StatusDotVariant =
  | "main"
  | "accent"
  | "clean"
  | "conflict"
  | "resolved"
  | "completed"
  | "in-progress"

interface StatusDotProps {
  size?: "sm" | "md"
  variant?: StatusDotVariant
  className?: string
}

const sizeClasses = {
  sm: "size-1.5",
  md: "size-2",
} as const

const variantClasses: Record<StatusDotVariant, Record<"sm" | "md", string>> = {
  main: {
    sm: "animate-pulse bg-tech-main/40",
    md: "animate-pulse bg-tech-main/50",
  },
  accent: {
    sm: "animate-pulse bg-tech-accent",
    md: "animate-pulse bg-tech-accent",
  },
  clean: {
    sm: "bg-tech-main/20",
    md: "bg-tech-main/20",
  },
  conflict: {
    sm: "bg-red-500",
    md: "bg-red-500",
  },
  resolved: {
    sm: "bg-green-500",
    md: "bg-green-500",
  },
  completed: {
    sm: "bg-green-500",
    md: "bg-green-500",
  },
  "in-progress": {
    sm: "animate-pulse bg-yellow-400",
    md: "animate-pulse bg-yellow-400",
  },
}

/** Small colored indicator dot for live/status readouts. */
export function StatusDot({
  size = "md",
  variant = "main",
  className,
}: StatusDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0",
        sizeClasses[size],
        variantClasses[variant][size],
        className
      )}
    />
  )
}

interface StatusBadgeProps {
  status: string
}

/** Localized draft-status chip (DRAFT, IN_REVIEW, SYNC_CONFLICT, …). */
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
    case "PENDING":
      className = "border-yellow-500/40 bg-yellow-500/10 text-yellow-700"
      label = t("draftPending")
      break
    case "SUBMITTED":
      className = "border-blue-500/40 bg-blue-500/10 text-blue-700"
      label = t("draftSubmitted")
      break
    case "APPROVED":
      className = "border-green-500/40 bg-green-500/10 text-green-600"
      label = t("approved")
      break
    case "MERGED":
      className = "border-green-500/40 bg-green-500/10 text-green-600"
      label = t("merged")
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

/** Review-hub status chip (PR, conflict, resolution mode). */
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
