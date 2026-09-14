"use client"

import { CopyArticleButton } from "@/components/articles/copy-article-button"
import { EditArticleButton } from "@/components/articles/edit-article-button"
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
