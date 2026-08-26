import type { ArticleLocale } from "@/lib/articles/manifest"
import { getCachedLocalizedArticleEntry } from "@/lib/articles/manifest-cached"
import { formatIndexPrefix } from "@/lib/articles/chapter-index-prefix"
import { findNavigationOwner } from "@/lib/articles/navigation-data"
import { getPublicChapterNav } from "@/lib/articles/public-tree"

function resolveArticleTitle(rawTitle: unknown, fallbackPath: string): string {
  if (typeof rawTitle === "string" && rawTitle.trim()) {
    return rawTitle.trim()
  }

  const fallback =
    fallbackPath.replace(/\/$/, "").split("/").pop()?.replace(/\.md$/i, "") ||
    "Article"

  return fallback
}

export async function resolveDisplayedArticleTitle(
  rawTitle: unknown,
  fallbackPath: string,
  canonicalSlug: string,
  isReadmeIntro: boolean,
  locale: ArticleLocale
): Promise<string> {
  const slugEntry = await getCachedLocalizedArticleEntry(canonicalSlug, locale)
  const introTitle = slugEntry?.introTitleByLocale?.[locale]?.trim()

  if (isReadmeIntro && introTitle) {
    return introTitle
  }

  const localizedTitle = slugEntry?.titleByLocale?.[locale]?.trim()
  if (localizedTitle) {
    return localizedTitle
  }

  // Cross-locale fallback: for English locale, use zh title if available
  if (locale === "en" && slugEntry?.titleByLocale?.zh?.trim()) {
    return slugEntry.titleByLocale.zh.trim()
  }

  return resolveArticleTitle(rawTitle, fallbackPath)
}

export function formatArticleTitle(
  title: string,
  index: number,
  isAppendix: boolean,
  isPreface: boolean,
  isReadmeIntro: boolean
): string {
  const prefix = isReadmeIntro
    ? formatIndexPrefix(0, false, false)
    : formatIndexPrefix(index, isAppendix, isPreface)

  return `${prefix}${title}`
}

/** Everything needed to render the article's displayed heading. */
export interface ArticleDisplayTitleInput {
  /** Raw frontmatter title (`chapter-title`). */
  frontmatterTitle: unknown
  filePath: string
  canonicalSlug: string
  index: number
  isPreface: boolean
  isReadmeIntro: boolean
  /** Content locale the article is served in. */
  locale: ArticleLocale
}

/**
 * Resolves and formats the full displayed article title, including the
 * chapter index prefix ("1.2 ", appendix/preface markers).
 */
export async function formatArticleDisplayTitle(
  input: ArticleDisplayTitleInput
): Promise<string> {
  const displayTitle = await resolveDisplayedArticleTitle(
    input.frontmatterTitle,
    input.filePath,
    input.canonicalSlug,
    input.isReadmeIntro,
    input.locale
  )
  const tree = await getPublicChapterNav(input.locale)
  const structuralOwner = findNavigationOwner(tree, input.canonicalSlug)

  return formatArticleTitle(
    displayTitle,
    input.index,
    structuralOwner?.isAppendix ?? false,
    input.isPreface,
    input.isReadmeIntro
  )
}

/**
 * Ensures the rendered markdown starts with an H1 matching the displayed
 * title: replaces a differing top-level heading or prepends one.
 */
export function embedTitleInMarkdown(content: string, title: string): string {
  const leadingWhitespace = content.match(/^\s*/)?.[0] ?? ""
  const trimmedStartContent = content.slice(leadingWhitespace.length)
  const escapedTitle = title.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const sameTitleHeadingPattern = new RegExp(
    `^#\\s+${escapedTitle}\\s*(?:\\r?\\n|$)`
  )
  const topLevelHeadingPattern = /^#\s+.+\s*(?:\r?\n|$)/

  if (sameTitleHeadingPattern.test(trimmedStartContent)) {
    return content
  }

  if (topLevelHeadingPattern.test(trimmedStartContent)) {
    const replacedContent = trimmedStartContent.replace(
      topLevelHeadingPattern,
      `# ${title}\n`
    )
    return `${leadingWhitespace}${replacedContent}`
  }

  return `# ${title}\n\n${content}`
}
