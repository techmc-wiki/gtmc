"use client"

import { useCallback } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Pen } from "lucide-react"

import { CopyButton } from "@/components/ui/copy-button"
import { IconButton } from "@/components/ui/icon-button"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/cn"

export interface ArticleHeadingActionsProps {
  /** Target file path for the draft editor. */
  editPath: string
  className?: string
}

/**
 * Action cluster rendered at the right edge of the article H1:
 * "Edit article" and "Copy as Markdown" buttons.
 */
export function ArticleHeadingActions({
  editPath,
  className,
}: ArticleHeadingActionsProps) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <EditArticleButton editPath={editPath} />
      <CopyArticleButton />
    </div>
  )
}

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

/**
 * "Copy as Markdown" control at the right edge of the article H1. Fetches the
 * public article URL with `Accept: text/markdown` (which the proxy rewrites to
 * the markdown endpoint) and copies the raw markdown to the clipboard.
 */
export function CopyArticleButton() {
  const t = useTranslations("ArticleMeta")
  const pathname = usePathname()

  const fetchMarkdown = useCallback(async () => {
    const response = await fetch(pathname, {
      headers: { Accept: "text/markdown" },
    })
    if (!response.ok) {
      throw new Error(`Markdown request failed with ${response.status}`)
    }
    return response.text()
  }, [pathname])

  return (
    <CopyButton
      getValue={fetchMarkdown}
      label={t("copyPage")}
      copiedLabel={t("copiedButton")}
      failedLabel={t("copyFailed")}
    />
  )
}
