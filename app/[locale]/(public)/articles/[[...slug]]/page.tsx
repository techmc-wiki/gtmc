import path from "path"
import { Suspense } from "react"
import "katex/dist/katex.min.css"
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import {
  calculateReadingMetrics,
  generateDescription,
  MarkdownRenderer,
} from "@/lib/markdown"
import { getCachedRehypeShiki } from "@/lib/markdown/plugins/rehype-shiki"
import {
  getArticleTree,
  getLocalizedArticleEntry,
  type ArticleLocale,
} from "@/lib/article-manifest"
import { getArticleContentBySlug } from "@/lib/article-content-store"
import { getSlugForFilePath } from "@/lib/slug-resolver"
import { decodeSlugPath, encodeSlug } from "@/lib/slug-utils"
import { formatIndexPrefix } from "@/lib/index-formatter"
import { getSiteUrl } from "@/lib/site-url"
import { articleAbsoluteUrl } from "@/lib/article-url"
import { CornerBrackets } from "@/components/ui/corner-brackets"
import { ArticleHighlight } from "@/components/articles/article-highlight"
import { ArticleMetadata } from "@/components/articles/article-metadata"
import { ArticleMetadataSimple } from "@/components/articles/article-metadata-simple"
import { ArticleNavigation } from "@/components/article-navigation"
import {
  flattenArticleTree,
  getArticleNavigation,
  getFirstArticleInChapter,
} from "@/lib/article-navigation"

import type { ArticleTreeNode as BaseArticleTreeNode } from "@/lib/github/sync"

export const revalidate = 3600

export async function generateStaticParams(): Promise<{ locale: string; slug: string[] }[]> {
  const locales = ["zh", "en"]
  const params: { locale: string; slug: string[] }[] = []

  for (const locale of locales) {
    const tree = await getArticleTree(locale as ArticleLocale)

    const collectArticleSlugs = (nodes: ArticleTreeNode[]): string[] => {
      const slugs: string[] = []

      for (const node of nodes) {
        if (!node.isFolder) {
          slugs.push(node.slug)
        }

        if (node.children && node.children.length > 0) {
          slugs.push(...collectArticleSlugs(node.children))
        }
      }

      return slugs
    }

    const slugs = collectArticleSlugs(tree)
    for (const slug of slugs) {
      params.push({
        locale,
        slug: slug.split("/").filter(Boolean),
      })
    }
  }

  return params
}

interface ArticlePageProps {
  params: Promise<{
    locale: string
    slug?: string[]
  }>
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params
  const locale = resolveLocale(rawLocale)
  const slugPath = decodeSlugPath(slug ?? []) || "preface"
  const target = await resolveArticleTarget(slugPath, locale)
  const t = await getTranslations("Article")

  if (target === null) {
    return {
      title: t("notFound"),
      description: "The requested article could not be found.",
    }
  }

  try {
    const artifact = getArticleContentBySlug(target.canonicalSlug ?? slugPath)
    if (!artifact) {
      return {
        title: t("notFound"),
        description: "The requested article could not be found.",
      }
    }

    const { content: mdBody, frontmatter: data } = artifact
    const siteUrl = getSiteUrl()
    const effectiveSlug =
      target.canonicalSlug ?? getSlugForFilePath(target.filePath) ?? slugPath
    const canonicalUrl = articleAbsoluteUrl(effectiveSlug)

    const resolvedTitle = resolveDisplayedArticleTitle(
      data["chapter-title"],
      target.filePath,
      target.canonicalSlug,
      target.isReadmeIntro,
      locale
    )
    const articleTitle = formatArticleTitle(
      resolvedTitle,
      target.index,
      target.isAppendix,
      target.isPreface,
      target.isReadmeIntro
    )

    // Build page title with chapter prefix if available
    const manifestEntry = getLocalizedArticleEntry(effectiveSlug, locale)
    const chapterTitle = manifestEntry?.chapterTitle
    const pageTitle = chapterTitle
      ? `${chapterTitle} › ${articleTitle} — Graduate Texts in Minecraft`
      : `${articleTitle} — Graduate Texts in Minecraft`

    const description = generateDescription(
      mdBody,
      data.description as string | undefined
    )

    const ogImageUrl = `${siteUrl}/api/og/articles/${effectiveSlug}`

    return {
      title: pageTitle,
      description,
      alternates: {
        canonical: canonicalUrl,
        languages: {
          "zh": `${getSiteUrl()}/zh/articles/${encodeSlug(effectiveSlug)}`,
          "en": `${getSiteUrl()}/en/articles/${encodeSlug(effectiveSlug)}`,
          "x-default": `${getSiteUrl()}/zh/articles/${encodeSlug(effectiveSlug)}`,
        },
      },
      openGraph: {
        title: pageTitle,
        description,
        type: "article",
        url: canonicalUrl,
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: pageTitle }],
      },
      twitter: {
        card: "summary_large_image",
        title: pageTitle,
        description,
        images: [ogImageUrl],
      },
    }
  } catch {
    return {
      title: t("notFound"),
      description: "The requested article could not be found.",
    }
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale: rawLocale, slug } = await params
  const locale = resolveLocale(rawLocale)

  const slugPath = decodeSlugPath(slug ?? []) || "preface"
  const target = await resolveArticleTarget(slugPath, locale)

  if (target === null) {
    notFound()
  }

  if (target.redirectToSlug) {
    const redirectPath = encodeSlug(target.redirectToSlug)
    redirect(`/${locale}/articles/${redirectPath}`)
  }

  const artifact = getArticleContentBySlug(target.canonicalSlug ?? slugPath)

  if (!artifact) {
    notFound()
  }

  const { content: renderedContent, frontmatter: data } = artifact
  const resolvedTitle = resolveDisplayedArticleTitle(
    data["chapter-title"],
    target.filePath,
    target.canonicalSlug,
    target.isReadmeIntro,
    locale
  )
  const articleTitle = formatArticleTitle(
    resolvedTitle,
    target.index,
    target.isAppendix,
    target.isPreface,
    target.isReadmeIntro
  )
  const embeddedArticleContent = embedTitleInMarkdown(
    renderedContent,
    articleTitle
  )

  const editPath = normalizeDraftTargetPath(target.filePath)

  const { wordCount, readingTime } = calculateReadingMetrics(renderedContent)
  const shikiPlugin = await getCachedRehypeShiki(renderedContent)

  const siteUrl = getSiteUrl()
  const effectiveSlug =
    target.canonicalSlug ?? getSlugForFilePath(target.filePath) ?? slugPath
  const canonicalUrl = articleAbsoluteUrl(effectiveSlug)
  const description = generateDescription(
    renderedContent,
    data.description as string | undefined
  )

  const author = data.author as string | undefined
  const coAuthors = (data["co-authors"] as string[] | undefined) || []
  const createdAt = data.date as string | undefined
  const lastModified = data.lastmod as string | undefined
  const isAdvanced = data["is-advanced"] === true

  const allAuthors = [
    ...new Set([author, ...coAuthors].filter(Boolean) as string[]),
  ]
  const authorArray = allAuthors.map((name) => ({
    "@type": "Person" as const,
    name,
    url: `https://github.com/${name}`,
  }))

  const manifestEntry = getLocalizedArticleEntry(effectiveSlug, locale)
  const chapterTitle = manifestEntry?.chapterTitle

  const bannerSrc = (data.banner as { src?: string } | undefined)?.src
  const bannerUrl = resolveBannerUrl(bannerSrc, target.filePath, siteUrl)
  const bannerPath = resolveBannerPath(bannerSrc, target.filePath)
  const bannerAlt =
    (data.banner as { alt?: string } | undefined)?.alt || articleTitle

  const techArticleJsonLd: {
    "@context": "https://schema.org"
    "@type": "TechArticle"
    headline: string
    url: string
    datePublished?: string
    dateModified?: string
    author?: Array<{
      "@type": "Person"
      name: string
      url: string
    }>
    description: string
    wordCount: number
    timeRequired: string
    articleSection?: string
    proficiencyLevel: string
    image?: string
  } = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: articleTitle,
    url: canonicalUrl,
    ...(createdAt ? { datePublished: createdAt } : {}),
    ...(lastModified ? { dateModified: lastModified } : {}),
    ...(authorArray.length > 0 ? { author: authorArray } : {}),
    description,
    wordCount,
    timeRequired: `PT${readingTime}M`,
    ...(chapterTitle ? { articleSection: chapterTitle } : {}),
    proficiencyLevel: isAdvanced ? "Expert" : "Beginner",
    ...(bannerUrl ? { image: bannerUrl } : {}),
  }

  const breadcrumbJsonLd: {
    "@context": "https://schema.org"
    "@type": "BreadcrumbList"
    itemListElement: Array<{
      "@type": "ListItem"
      position: number
      name: string
      item: string
    }>
  } = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: chapterTitle || "Articles",
        item: `${siteUrl}/articles`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: articleTitle,
        item: canonicalUrl,
      },
    ],
  }

  // Get navigation data
  const tree = await getArticleTree(locale)
  const flattenedArticles = flattenArticleTree(tree)
  const currentSlug = target.canonicalSlug || slugPath
  const navigation = getArticleNavigation(currentSlug, flattenedArticles, locale)

  return (
    <div
      className="
        relative min-h-screen min-w-0 overflow-x-clip border border-tech-main/40 bg-transparent
        p-6 backdrop-blur-sm
        sm:p-8
      ">
      <CornerBrackets size="size-4" />

      {/* Article Header */}
      {author && createdAt && lastModified ? (
        <ArticleMetadata
          title={articleTitle}
          author={author}
          coAuthors={coAuthors}
          createdAt={createdAt}
          lastModified={lastModified}
          canonicalUrl={canonicalUrl}
          filePath={target.filePath}
          wordCount={wordCount}
          readingTime={readingTime}
          editPath={editPath}
          isAdvanced={isAdvanced}
          bannerPath={bannerPath}
          bannerAlt={bannerAlt}
        />
      ) : (
        <ArticleMetadataSimple
          title={articleTitle}
          canonicalUrl={canonicalUrl}
          attributionDate={lastModified || createdAt}
          filePath={target.filePath}
          wordCount={wordCount}
          readingTime={readingTime}
          isAdvanced={isAdvanced}
          bannerPath={bannerPath}
          bannerAlt={bannerAlt}
        />
      )}

      <article className="min-w-0" data-article-content>
        <MarkdownRenderer
          content={embeddedArticleContent}
          rawPath={target.filePath}
          shikiPlugin={shikiPlugin}
        />
      </article>

      {(navigation.prev || navigation.next) && (
        <ArticleNavigation prev={navigation.prev} next={navigation.next} />
      )}

      <Suspense>
        <ArticleHighlight />
      </Suspense>

      <script type="application/ld+json">
        {JSON.stringify(techArticleJsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbJsonLd)}
      </script>
    </div>
  )
}

function normalizeDraftTargetPath(filePath: string) {
  if (filePath === "README.md" || filePath.endsWith("/README.md")) {
    return filePath
  }

  return filePath.replace(/\.md$/, "")
}

type ArticleTreeNode = BaseArticleTreeNode & { index?: number }

interface ResolvedArticleTarget {
  filePath: string
  canonicalSlug: string
  index: number
  isAppendix: boolean
  isPreface: boolean
  isReadmeIntro: boolean
  redirectToSlug?: string
}

async function resolveArticleTarget(
  requestedSlugPath: string,
  locale: ArticleLocale
): Promise<ResolvedArticleTarget | null> {
  const normalizedSlug = requestedSlugPath.replace(/\.md$/i, "")
  const tree: ArticleTreeNode[] = await getArticleTree(locale)
  const targetNode = findNodeBySlug(tree, normalizedSlug)

  if (!targetNode) {
    return null
  }

  const canonicalSlug = targetNode.isFolder
    ? resolveCanonicalSlugForFolder(targetNode, locale)
    : targetNode.slug

  if (!canonicalSlug) {
    return null
  }

  const filePath = getLocalizedArticleEntry(canonicalSlug, locale)?.filePath ?? null
  if (!filePath) {
    return null
  }

  const slugEntry = getLocalizedArticleEntry(canonicalSlug, locale)

  const redirectToSlug =
    targetNode.isFolder && canonicalSlug !== normalizedSlug
      ? canonicalSlug
      : undefined

  return {
    filePath,
    canonicalSlug,
    index: slugEntry?.index ?? -1,
    isAppendix: slugEntry?.isAppendix ?? false,
    isPreface: slugEntry?.isPreface ?? false,
    isReadmeIntro: Boolean(slugEntry?.isFolder && slugEntry?.hasIntro),
    redirectToSlug,
  }
}

function resolveCanonicalSlugForFolder(
  targetNode: ArticleTreeNode,
  locale: ArticleLocale
): string | null {
  const mapEntry = getLocalizedArticleEntry(targetNode.slug, locale)
  if (mapEntry?.hasIntro) {
    return targetNode.slug
  }

  return resolveFirstArticleSlug(targetNode.children ?? [], locale)
}

function findNodeBySlug(
  nodes: ArticleTreeNode[],
  targetSlug: string
): ArticleTreeNode | null {
  for (const node of nodes) {
    if (node.slug === targetSlug) {
      return node
    }

    const nested = findNodeBySlug(node.children ?? [], targetSlug)
    if (nested) {
      return nested
    }
  }

  return null
}

function resolveFirstArticleSlug(children: ArticleTreeNode[], locale: ArticleLocale): string | null {
  if (!children || children.length === 0) {
    return null
  }

  const chapterEntries = children.map((child) => ({
      filePath: getLocalizedArticleEntry(child.slug, locale)?.filePath ?? `${child.slug}.md`,
    slug: child.slug,
    index: child.index ?? -1,
    isFolder: child.isFolder,
  }))

  const firstEntry = getFirstArticleInChapter(chapterEntries)
  if (!firstEntry) {
    return null
  }

  if (!firstEntry.isFolder) {
    return firstEntry.slug
  }

  const matchedFolder = children.find((child) => child.slug === firstEntry.slug)
  if (!matchedFolder) {
    return null
  }

  return resolveFirstArticleSlug(matchedFolder.children ?? [], locale)
}

function resolveArticleTitle(rawTitle: unknown, fallbackPath: string): string {
  if (typeof rawTitle === "string" && rawTitle.trim()) {
    return rawTitle.trim()
  }

  const fallback =
    fallbackPath.split("/").filter(Boolean).pop()?.replace(/\.md$/i, "") ||
    "Article"

  return fallback
}

function resolveDisplayedArticleTitle(
  rawTitle: unknown,
  fallbackPath: string,
  canonicalSlug: string,
  isReadmeIntro: boolean,
  locale: ArticleLocale
): string {
  const slugEntry = getLocalizedArticleEntry(canonicalSlug, locale)
  const introTitle = slugEntry?.introTitle?.trim()

  if (isReadmeIntro && introTitle) {
    return introTitle
  }

  return resolveArticleTitle(rawTitle, fallbackPath)
}

function resolveLocale(locale: string): ArticleLocale {
  return locale === "zh" ? "zh" : "en"
}

function formatArticleTitle(
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

function embedTitleInMarkdown(content: string, title: string): string {
  const leadingWhitespace = content.match(/^\s*/)?.[0] ?? ""
  const trimmedStartContent = content.slice(leadingWhitespace.length)
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
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

function resolveBannerUrl(
  bannerSrc: string | undefined,
  filePath: string,
  siteUrl: string
): string | null {
  if (!bannerSrc || typeof bannerSrc !== "string" || !bannerSrc.trim()) {
    return null
  }
  const currentDir = path.dirname("/" + filePath).replace(/^\/+/, "")
  const resolved = path.join(currentDir, bannerSrc).replace(/\\/g, "/")
  return `${siteUrl}/api/assets?path=${encodeURIComponent(resolved)}`
}

function resolveBannerPath(
  bannerSrc: string | undefined,
  filePath: string
): string | null {
  if (!bannerSrc || typeof bannerSrc !== "string" || !bannerSrc.trim()) {
    return null
  }
  const currentDir = path.dirname("/" + filePath).replace(/^\/+/, "")
  return path.join(currentDir, bannerSrc).replace(/\\/g, "/")
}
