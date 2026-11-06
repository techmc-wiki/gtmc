import type { LinearizedArticle } from "@/lib/articles/linearize"

import { buildBookPlan } from "./numbering"
import type { BookPlan } from "./types"

/**
 * Plans only the articles whose emitted body is non-empty. Filtering runs
 * before numbering, so a dropped article or chapter leaves no gap in the
 * printed numbers.
 */
export function assembleBookPlan(
  articles: LinearizedArticle[],
  hasContent: (slug: string) => boolean
): BookPlan {
  return buildBookPlan(articles.filter((article) => hasContent(article.slug)))
}
