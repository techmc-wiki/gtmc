import { Suspense } from "react"
// eslint-disable-next-line import/no-unassigned-import
import "katex/dist/katex.min.css"
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import {
  calculateReadingMetrics,
  ensureMetaDescriptionLength,
  generateDescription,
  MarkdownRenderer,
} from "@/lib/markdown"
import { getCachedRehypeShiki } from "@/lib/markdown/syntax/rehype-shiki"
import {
  getArticleAvailableLocales,
  hasArticleLocale,
  loadArticleManifest,
  type ArticleLocale,
} from "@/lib/articles/manifest"
import {
  resolveAuthorPerson,
  resolveProfileHandle,
} from "@/lib/articles/person-resolver"
import {
  getCachedArticleTree,
  getCachedLocalizedArticleEntry,
  getCachedSlugForFilePath,
} from "@/lib/articles/manifest-cached"
import { getArticleContentBySlug } from "@/lib/articles/content"
import { resolveArticleAssetPath } from "@/lib/articles/article-asset-path"
import { getArticleAssetPublicUrl } from "@/lib/articles/asset-url"
import { articleUrl } from "@/lib/articles/url"
import { decodeSlugPath, encodeSlug } from "@/lib/articles/slug-resolver"
import { formatIndexPrefix } from "@/lib/articles/chapter-index-prefix"
import { getSiteUrl } from "@/lib/site-url"
import { serializeJsonLd } from "@/lib/seo/json-ld"

import { ArticleHighlight } from "@/components/articles/article-highlight"
import { BookmarkRecorder } from "@/components/articles/bookmark-recorder"
import { RunningHead } from "@/components/articles/running-head"
import { ChapterEndMark } from "@/components/articles/chapter-end-mark"
import { ArticleMetadataFull } from "@/components/articles/article-metadata-full"
import { ArticleMetadataAnonymous } from "@/components/articles/article-metadata-anonymous"
import { ArticleNavigation } from "@/components/articles/article-navigation"
import {
  getNavigationBreadcrumbs,
  findNavigationOwner,
  flattenArticleTree,
  getArticleNavigation,
  getFirstArticleInChapter,
} from "@/lib/articles/navigation-data"
import { getPublicChapterNav } from "@/lib/articles/public-tree"

import type { ArticleTreeNode as BaseArticleTreeNode } from "@/lib/github/sync"

const EMPTY_STRING_ARRAY: string[] = []
const SOURCE_ARTICLE_LOCALE: ArticleLocale = "zh"

export async function generateStaticParams(): Promise<{ locale: string; slug: string[] }[]> {
  const locales: ArticleLocale[] = ["zh", "en"]
  const paramsByLocale = await Promise.all(
    locales.map(async (locale) => {
      const contentLocale = getArticleFallbackLocale(locale)
      const tree = await getCachedArticleTree(contentLocale)
      const collectSlugs = async (
        nodes: ArticleTreeNode[]
      ): Promise<string[]> => {
        const slugGroups = await Promise.all(
          nodes.map(async (node) => {
            const manifestEntry = await getCachedLocalizedArticleEntry(
              node.slug,
              contentLocale
            )
            const ownSlugs =
              (!node.isFolder || manifestEntry?.hasIntro) &&
              hasArticleLocale(node.slug, contentLocale)
                ? [node.slug]
                : []
            const childSlugs = await collectSlugs(node.children ?? [])
            return [...ownSlugs, ...childSlugs]
          })
        )
        return slugGroups.flat()
      }

      const slugs = await collectSlugs(tree)
      return slugs.map((slug) => ({
        locale,
        slug: slug.split("/").filter(Boolean),
      }))
    })
  )

  return paramsByLocale.flat()
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
  const resolvedRequest = await resolveArticleRequest(slugPath, locale)

  // Per Next.js docs: call notFound() from generateMetadata (not return a
  // fallback metadata object) so the route emits a real HTTP 404 status and
  // avoids being indexed as a soft-404.
  if (resolvedRequest === null) {
    notFound()
  }

  try {
    const { contentLocale, target } = resolvedRequest
    const artifact = await getArticleContentBySlug(
      target.canonicalSlug ?? slugPath,
      contentLocale
    )
    if (!artifact) {
      notFound()
    }

    const { content: mdBody, frontmatter: data } = artifact
    const siteUrl = getSiteUrl()
    const effectiveSlug =
      target.canonicalSlug ?? (await getCachedSlugForFilePath(target.filePath)) ?? slugPath
    const canonicalUrl = `${getSiteUrl()}/${contentLocale}/articles/${encodeSlug(effectiveSlug)}`

    const resolvedTitle = await resolveDisplayedArticleTitle(
      data["chapter-title"],
      target.filePath,
      target.canonicalSlug,
      target.isReadmeIntro,
      contentLocale
    )
    const tree = await getPublicChapterNav(contentLocale)
    const structuralOwner = findNavigationOwner(tree, effectiveSlug)
    const isStructuralAppendix = structuralOwner?.isAppendix ?? false
    const articleTitle = formatArticleTitle(
      resolvedTitle,
      target.index,
      isStructuralAppendix,
      target.isPreface,
      target.isReadmeIntro
    )

    // Build page title with chapter prefix if available
    const manifestEntry = await getCachedLocalizedArticleEntry(
      effectiveSlug,
      contentLocale
    )
    const chapterTitle = manifestEntry?.chapterTitleByLocale?.[contentLocale]
    const pageTitle = chapterTitle
      ? `${chapterTitle} › ${articleTitle}`
      : articleTitle

    const description = ensureMetaDescriptionLength(
      generateDescription(mdBody, data.description as string | undefined),
      {
        title: articleTitle,
        chapterTitle,
        locale: contentLocale,
      }
    )

    const articlePath = encodeSlug(effectiveSlug)
    const availableLocales = getArticleAvailableLocales(effectiveSlug)
    const defaultLocale = availableLocales.includes("zh")
      ? "zh"
      : availableLocales[0]
    const languageAlternates = Object.fromEntries(
      availableLocales.map((availableLocale) => [
        availableLocale,
        `${siteUrl}/${availableLocale}/articles/${articlePath}`,
      ])
    )

    if (defaultLocale) {
      languageAlternates["x-default"] = `${siteUrl}/${defaultLocale}/articles/${articlePath}`
    }

    const ogImageUrl = `${siteUrl}/api/og/articles/${effectiveSlug}?locale=${contentLocale}`

    return {
      title: pageTitle,
      description,
      alternates: {
        canonical: canonicalUrl,
        languages: languageAlternates,
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
    notFound()
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale: rawLocale, slug } = await params
  const locale = resolveLocale(rawLocale)
  const [t, tArticleMeta] = await Promise.all([
    getTranslations({ locale, namespace: "Article" }),
    getTranslations({ locale, namespace: "ArticleMeta" }),
  ])

  const slugPath = decodeSlugPath(slug ?? []) || "preface"
  const resolvedRequest = await resolveArticleRequest(slugPath, locale)

  if (resolvedRequest === null) {
    notFound()
  }

  const { contentLocale, target } = resolvedRequest

  if (target.redirectToSlug) {
    const redirectPath = encodeSlug(target.redirectToSlug)
    redirect(`/${locale}/articles/${redirectPath}`)
  }

  const artifact = await getArticleContentBySlug(
    target.canonicalSlug ?? slugPath,
    contentLocale
  )

  if (!artifact) {
    notFound()
  }

  const {
    content: renderedContent,
    frontmatter: data,
    translationStatus,
  } = artifact
  const resolvedTitle = await resolveDisplayedArticleTitle(
    data["chapter-title"],
    target.filePath,
    target.canonicalSlug,
    target.isReadmeIntro,
    contentLocale
  )
  const tree = await getPublicChapterNav(contentLocale)
  const currentSlug = target.canonicalSlug || slugPath
  const runningHeadOwner = findNavigationOwner(tree, currentSlug)
  const runningHeadChapters = getNavigationBreadcrumbs(tree, currentSlug)
  const isStructuralAppendix = runningHeadOwner?.isAppendix ?? false
  const articleTitle = formatArticleTitle(
    resolvedTitle,
    target.index,
    isStructuralAppendix,
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
    target.canonicalSlug ?? (await getCachedSlugForFilePath(target.filePath)) ?? slugPath
  const canonicalUrl = `${getSiteUrl()}/${contentLocale}/articles/${encodeSlug(effectiveSlug)}`
  const manifestEntry = await getCachedLocalizedArticleEntry(
    effectiveSlug,
    contentLocale
  )
  const chapterTitle = manifestEntry?.chapterTitleByLocale?.[contentLocale]
  const description = ensureMetaDescriptionLength(
    generateDescription(
      renderedContent,
      data.description as string | undefined
    ),
    {
      title: articleTitle,
      chapterTitle,
      locale: contentLocale,
    }
  )

  const author = data.author as string | undefined
  const coAuthors: string[] =
    (data.coAuthors as string[] | undefined) ?? EMPTY_STRING_ARRAY
  const createdAt = data.created as string | undefined
  const lastModified = data.lastmod as string | undefined
  const isAdvanced = data["is-advanced"] === true
  const isRevising = manifestEntry?.isRevising === true

  const allAuthors = [
    ...new Set([author, ...coAuthors].filter(Boolean) as string[]),
  ]
  const profileManifest = loadArticleManifest()
  const profileHandles = [
    ...new Set(
      allAuthors.map(
        (name) => resolveProfileHandle(name, profileManifest) ?? name
      )
    ),
  ]
  const authorArray = profileHandles.map((handle) => ({
    "@type": "Person" as const,
    "@id": `${siteUrl}/${locale}/authors/${encodeURIComponent(handle)}#person`,
    name: resolveAuthorPerson(handle).name,
    url: `${siteUrl}/${locale}/authors/${encodeURIComponent(handle)}`,
  }))
  const isTranslationPending = contentLocale !== locale
  const isTranslationStale =
    locale === "en" &&
    manifestEntry?.translationFreshnessByLocale.en === "stale" &&
    translationStatus !== undefined

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
      "@id": string
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
        item: `${siteUrl}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Articles",
        item: `${siteUrl}/${locale}/articles`,
      },
      ...runningHeadChapters
        .filter((chapter) => chapter.slug !== effectiveSlug)
        .map((chapter, index) => ({
          "@type": "ListItem" as const,
          position: index + 3,
          name: chapter.title,
          item: `${siteUrl}/${locale}${articleUrl(chapter.slug)}`,
        })),
      {
        "@type": "ListItem",
        position:
          runningHeadChapters.filter((chapter) => chapter.slug !== effectiveSlug)
            .length + 3,
        name: articleTitle,
        item: canonicalUrl,
      },
    ],
  }

  // Get navigation data (tree already loaded for structural appendix context)
  const flattenedArticles = flattenArticleTree(tree)
  const navigation = await getArticleNavigation(currentSlug, flattenedArticles, locale)

  const runningHeadChapterIndex = runningHeadOwner?.index
  const runningHeadIsAppendix = isStructuralAppendix
  const runningHeadIsPreface = !!target.isPreface && !runningHeadOwner

  return (
    <div
      className="
        border-tech-main/30 bg-surface/80 relative min-h-screen
        min-w-0 border p-6 backdrop-blur-sm sm:p-8
      ">
      <BookmarkRecorder slug={currentSlug} title={articleTitle} />

      {runningHeadChapters.length > 0 && (
        <RunningHead
          chapters={runningHeadChapters}
          articleSlug={effectiveSlug}
          articleTitle={articleTitle}
          locale={locale}
          chapterIndex={runningHeadChapterIndex}
          chapterIsAppendix={runningHeadIsAppendix}
          isPreface={runningHeadIsPreface}
        />
      )}

      {/* Article Header */}
      {author && createdAt && lastModified ? (
        <ArticleMetadataFull
          title={articleTitle}
          author={profileHandles[0] ?? author}
          coAuthors={profileHandles.slice(1)}
          createdAt={createdAt}
          lastModified={lastModified}
          canonicalUrl={canonicalUrl}
          filePath={target.filePath}
          wordCount={wordCount}
          readingTime={readingTime}
          editPath={editPath}
          isAdvanced={isAdvanced}
          isRevising={isRevising}
          bannerPath={bannerPath}
          bannerAlt={bannerAlt}
        />
      ) : (
        <ArticleMetadataAnonymous
          title={articleTitle}
          canonicalUrl={canonicalUrl}
          attributionDate={lastModified || createdAt}
          filePath={target.filePath}
          wordCount={wordCount}
          readingTime={readingTime}
          isAdvanced={isAdvanced}
          isRevising={isRevising}
          bannerPath={bannerPath}
          bannerAlt={bannerAlt}
        />
      )}

      {isTranslationPending ? (
        <aside
          data-testid="translation-pending-notice"
          aria-labelledby="translation-pending-label"
          className="mt-4 border border-amber-500/40 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100">
          <p
            id="translation-pending-label"
            data-testid="translation-pending-badge"
            className="font-mono text-[0.625rem] tracking-[0.2em] text-amber-700 uppercase dark:text-amber-300">
            {t("translationPending")}
          </p>
          <p className="mt-2 text-sm/relaxed">
            {t("translationFallbackBody")}
          </p>
          <a
            href={`/${contentLocale}/articles/${encodeSlug(effectiveSlug)}`}
            className="mt-3 inline-flex min-h-11 items-center font-mono text-xs tracking-wider text-amber-900 underline decoration-amber-700/50 underline-offset-4 transition-colors hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-amber-100 dark:hover:text-amber-300 dark:focus-visible:outline-amber-300">
            {t("translationFallbackCta")} →
          </a>
        </aside>
      ) : null}

      {isTranslationStale ? (
        <aside
          data-testid="translation-stale-badge"
          aria-labelledby="translation-outdated-label"
          className="mt-4 border border-amber-500/40 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100">
          <p
            id="translation-outdated-label"
            className="font-mono text-[0.625rem] tracking-[0.2em] text-amber-700 uppercase dark:text-amber-300">
            {t("translationOutdatedLabel")}
          </p>
          <p className="mt-2 text-sm/relaxed">
            {t("translationOutdatedPrefix")} {" "}
            <a
              href={translationStatus.latestOriginalCommitUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t("translationLatestCommitAria", {
                sha: translationStatus.latestOriginalRevision.slice(0, 7),
              })}
              className="font-mono underline decoration-amber-700/50 underline-offset-4 transition-colors hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:hover:text-amber-300 dark:focus-visible:outline-amber-300">
              {translationStatus.latestOriginalRevision.slice(0, 7)}
            </a>
            {". "}
            {t("translationOutdatedLag", {
              commitLag: translationStatus.commitLag,
              dayLag: translationStatus.dayLag,
            })}
          </p>
        </aside>
      ) : null}

      <article
        lang={contentLocale}
        className="article-prose min-w-0"
        data-article-content>
        <MarkdownRenderer
          content={embeddedArticleContent}
          locale={locale}
          rawPath={target.filePath}
          shikiPlugin={shikiPlugin}
        />
      </article>

      <ChapterEndMark isAdvanced={isAdvanced} />

      {(navigation.prev || navigation.next) && (
        <ArticleNavigation
          locale={locale}
          next={navigation.next}
          nextLabel={tArticleMeta("next")}
          prev={navigation.prev}
          prevLabel={tArticleMeta("prev")}
        />
      )}

      <Suspense>
        <ArticleHighlight />
      </Suspense>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={serializeJsonLd(techArticleJsonLd)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={serializeJsonLd(breadcrumbJsonLd)}
      />
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
  isPreface: boolean
  isReadmeIntro: boolean
  redirectToSlug?: string
}

interface ResolvedArticleRequest {
  contentLocale: ArticleLocale
  target: ResolvedArticleTarget
}

async function resolveArticleRequest(
  requestedSlugPath: string,
  locale: ArticleLocale
): Promise<ResolvedArticleRequest | null> {
  const localizedTarget = await resolveArticleTarget(requestedSlugPath, locale)
  if (localizedTarget) {
    return { contentLocale: locale, target: localizedTarget }
  }

  const fallbackLocale = getArticleFallbackLocale(locale)
  if (fallbackLocale === locale) {
    return null
  }

  const fallbackTarget = await resolveArticleTarget(
    requestedSlugPath,
    fallbackLocale
  )
  return fallbackTarget
    ? { contentLocale: fallbackLocale, target: fallbackTarget }
    : null
}

function getArticleFallbackLocale(locale: ArticleLocale): ArticleLocale {
  return locale === SOURCE_ARTICLE_LOCALE ? locale : SOURCE_ARTICLE_LOCALE
}

async function resolveArticleTarget(
  requestedSlugPath: string,
  locale: ArticleLocale
): Promise<ResolvedArticleTarget | null> {
  const normalizedSlug = requestedSlugPath.replace(/\.md$/i, "")
  const tree: ArticleTreeNode[] = await getCachedArticleTree(locale)
  const targetNode = findNodeBySlug(tree, normalizedSlug)

  if (!targetNode) {
    return null
  }

  const canonicalSlug = targetNode.isFolder
    ? await resolveCanonicalSlugForFolder(targetNode, locale)
    : targetNode.slug

  if (!canonicalSlug) {
    return null
  }

  if (!hasArticleLocale(canonicalSlug, locale)) {
    return null
  }

  const slugEntry = await getCachedLocalizedArticleEntry(canonicalSlug, locale)
  const filePath = slugEntry?.filePath ?? null
  if (!filePath) {
    return null
  }

  const redirectToSlug =
    targetNode.isFolder && canonicalSlug !== normalizedSlug
      ? canonicalSlug
      : undefined

  return {
    filePath,
    canonicalSlug,
    index: slugEntry?.index ?? -1,
    isPreface: slugEntry?.isPreface ?? false,
    isReadmeIntro: Boolean(slugEntry?.isFolder && slugEntry?.hasIntro),
    redirectToSlug,
  }
}

async function resolveCanonicalSlugForFolder(
  targetNode: ArticleTreeNode,
  locale: ArticleLocale
): Promise<string | null> {
  const mapEntry = await getCachedLocalizedArticleEntry(targetNode.slug, locale)
  if (mapEntry?.hasIntro && hasArticleLocale(targetNode.slug, locale)) {
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

async function resolveFirstArticleSlug(children: ArticleTreeNode[], locale: ArticleLocale): Promise<string | null> {
  if (!children || children.length === 0) {
    return null
  }

  const chapterEntries = await Promise.all(
    children.map(async (child) => ({
      filePath:
        (await getCachedLocalizedArticleEntry(child.slug, locale))?.filePath ??
        `${child.slug}.md`,
      slug: child.slug,
      index: child.index ?? -1,
      isFolder: child.isFolder,
    }))
  )

  const firstEntry = getFirstArticleInChapter(chapterEntries)
  if (!firstEntry) {
    return null
  }

  if (!firstEntry.isFolder) {
    return hasArticleLocale(firstEntry.slug, locale) ? firstEntry.slug : null
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
    fallbackPath.replace(/\/$/, "").split("/").pop()?.replace(/\.md$/i, "") ||
    "Article"

  return fallback
}

async function resolveDisplayedArticleTitle(
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

function resolveBannerUrl(
  bannerSrc: string | undefined,
  filePath: string,
  siteUrl: string
): string | null {
  const resolved = resolveArticleAssetPath(bannerSrc, filePath)
  if (!resolved) return null

  const publicUrl = getArticleAssetPublicUrl(resolved)
  if (publicUrl.startsWith("https://") || publicUrl.startsWith("http://")) {
    return publicUrl
  }

  return `${siteUrl}${publicUrl}`
}

function resolveBannerPath(
  bannerSrc: string | undefined,
  filePath: string
): string | null {
  return resolveArticleAssetPath(bannerSrc, filePath)
}
