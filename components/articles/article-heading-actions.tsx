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
  editPath: string
  className?: string
}

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
  editPath: string
  className?: string
}

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

/** Resolves to the current article's raw Markdown through content negotiation. */
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
