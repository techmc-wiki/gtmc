"use client"

import { Pen } from "lucide-react"
import { useTranslations } from "next-intl"

import { IconButton } from "@/components/ui/icon-button"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/cn"

export interface EditArticleButtonProps {
  /** Target file path for the draft editor (e.g. "EntityMove/01-实体运动基础.zh"). */
  editPath: string
  className?: string
}

/**
 * "Edit article" action linking to the draft editor workspace. Sits beside
 * "Copy as Markdown" in the article heading action cluster.
 */
export function EditArticleButton({
  editPath,
  className,
}: EditArticleButtonProps) {
  const t = useTranslations("ArticleMeta")

  return (
    <IconButton
      asChild
      className={cn("md:size-8", className)}
      label={t("editArticle")}>
      <Link
        href={`/draft/new?file=${encodeURIComponent(editPath)}`}
        aria-label={t("editArticle")}>
        <Pen className="size-4" aria-hidden="true" />
      </Link>
    </IconButton>
  )
}
