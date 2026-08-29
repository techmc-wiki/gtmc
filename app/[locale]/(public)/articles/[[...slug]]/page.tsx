import { Suspense } from "react"
// eslint-disable-next-line import/no-unassigned-import
import "katex/dist/katex.min.css"
import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
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
import {
  resolveArticleLocale,
  resolveArticleRequest,
  type ArticleTreeNode,
} from "@/lib/articles/article-request"
import {
  embedTitleInMarkdown,
  formatArticleDisplayTitle,
} from "@/lib/articles/article-title"
import { articleUrl, getArticleAssetPublicUrl } from "@/lib/articles/url"
import { decodeSlugPath, encodeSlug } from "@/lib/articles/slug-resolver"
import { getSiteUrl } from "@/lib/site-url"
import { serializeJsonLd } from "@/lib/seo/json-ld"

import { ArticleHighlight } from "@/components/articles/article-highlight"
import { BookmarkRecorder } from "@/components/articles/bookmark-recorder"
import { RunningHead, ChapterEndMark } from "@/components/articles/chapter-chrome"
import { CopyArticleButton } from "@/components/articles/copy-article-button"
import {
  ArticleMetadataFull,
  ArticleMetadataAnonymous,
} from "@/components/articles/article-metadata"
import { ArticleNavigation } from "@/components/articles/article-navigation"
import {
  getNavigationBreadcrumbs,
  findNavigationOwner,
  flattenArticleTree,
  getArticleNavigation,
} from "@/lib/articles/navigation-data"
import { getPublicChapterNav } from "@/lib/articles/public-tree"


const EMPTY_STRING_ARRAY: string[] = []
const COPY_PAGE_ACTION = <CopyArticleButton />

export async function generateStaticParams(): Promise<{ locale: string; slug: string[] }[]> {
  const locales: ArticleLocale[] = ["zh", "en"]
  const paramsByLocale = await Promise.all(
    locales.map(async (locale) => {
      const tree = await getCachedArticleTree(locale)
      const collectSlugs = async (
        nodes: ArticleTreeNode[]
      ): Promise<string[]> => {
        const slugGroups = await Promise.all(
          nodes.map(async (node) => {
            const manifestEntry = await getCachedLocalizedArticleEntry(
              node.slug,
              locale
            )
            const ownSlugs =
              (!node.isFolder || manifestEntry?.hasIntro) &&
              hasArticleLocale(node.slug, locale)
                ? [node.slug]
                : []
            const childSlugs = await collectSlugs(node.children ?? [])
            return [...ownSlugs, ...childSlugs]
          })
        )
        return slugGroups.flat()
      }

      const slugs = await collectSlugs(tree)
      const entries: Array<{ locale: ArticleLocale; slug: string[] }> = []
      for (const slug of slugs) {
        entries.push({
          locale,
          slug: slug.split("/").filter(Boolean),
        })
      }
      return entries
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
  const locale = resolveArticleLocale(rawLocale)
  const slugPath = decodeSlugPath(slug ?? []) || "preface"
  const resolvedRequest = await resolveArticleRequest(slugPath, locale)

  // Per Next.js docs: call notFound() from generateMetadata (not return a
  // fallback metadata object) so the route emits a real HTTP 404 status and
  // avoids being indexed as a soft-404.
  if (resolvedRequest === null) {
    notFound()
  }

  const { contentLocale, target, redirectToLocale } = resolvedRequest

  if (!slug?.length || target.redirectToSlug || redirectToLocale) {
    permanentRedirect(
      `/${redirectToLocale ?? locale}/articles/${encodeSlug(target.canonicalSlug)}`
    )
  }

  let artifact: Awaited<ReturnType<typeof getArticleContentBySlug>> | null = null
  try {
    artifact = await getArticleContentBySlug(
      target.canonicalSlug ?? slugPath,
      contentLocale
    )
  } catch {
    notFound()
  }

  if (!artifact) {
    notFound()
  }

  try {
    const { content: mdBody, frontmatter: data } = artifact
    const siteUrl = getSiteUrl()
    const effectiveSlug =
      target.canonicalSlug ?? (await getCachedSlugForFilePath(target.filePath)) ?? slugPath
    const canonicalUrl = `${getSiteUrl()}/${contentLocale}/articles/${encodeSlug(effectiveSlug)}`

    const articleTitle = await formatArticleDisplayTitle({
      frontmatterTitle: data["chapter-title"],
      filePath: target.filePath,
      canonicalSlug: target.canonicalSlug,
      index: target.index,
      isPreface: target.isPreface,
      isReadmeIntro: target.isReadmeIntro,
      locale: contentLocale,
    })

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
  const locale = resolveArticleLocale(rawLocale)
  const [t, tArticleMeta] = await Promise.all([
    getTranslations({ locale, namespace: "Article" }),
    getTranslations({ locale, namespace: "ArticleMeta" }),
  ])

  const slugPath = decodeSlugPath(slug ?? []) || "preface"
  const resolvedRequest = await resolveArticleRequest(slugPath, locale)

  if (resolvedRequest === null) {
    notFound()
  }

  const { contentLocale, target, redirectToLocale } = resolvedRequest

  if (!slug?.length || target.redirectToSlug || redirectToLocale) {
    permanentRedirect(
      `/${redirectToLocale ?? locale}/articles/${encodeSlug(target.canonicalSlug)}`
    )
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
  const articleTitle = await formatArticleDisplayTitle({
    frontmatterTitle: data["chapter-title"],
    filePath: target.filePath,
    canonicalSlug: target.canonicalSlug,
    index: target.index,
    isPreface: target.isPreface,
    isReadmeIntro: target.isReadmeIntro,
    locale: contentLocale,
  })
  const tree = await getPublicChapterNav(contentLocale)
  const currentSlug = target.canonicalSlug || slugPath
  const runningHeadOwner = findNavigationOwner(tree, currentSlug)
  const runningHeadChapters = getNavigationBreadcrumbs(tree, currentSlug)
  const isStructuralAppendix = runningHeadOwner?.isAppendix ?? false
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

  const bannerPreloadHref = bannerPath
    ? getArticleAssetPublicUrl(bannerPath)
    : null

  const { breadcrumbJsonLd, techArticleJsonLd } = buildArticleStructuredData({
    articleTitle,
    authorArray,
    bannerUrl,
    canonicalUrl,
    chapterTitle,
    createdAt,
    effectiveSlug,
    isAdvanced,
    lastModified,
    locale,
    readingTime,
    runningHeadChapters,
    siteUrl,
    wordCount,
    description,
  })

  // Get navigation data (tree already loaded for structural appendix context)
  const flattenedArticles = flattenArticleTree(tree)
  const navigation = await getArticleNavigation(currentSlug, flattenedArticles, locale)


  return (
    <ArticlePageContent
      articleTitle={articleTitle}
      bannerAlt={bannerAlt}
      bannerPath={bannerPath}
      bannerPreloadHref={bannerPreloadHref}
      breadcrumbJsonLd={breadcrumbJsonLd}
      canonicalUrl={canonicalUrl}
      contentLocale={contentLocale}
      createdAt={createdAt}
      currentSlug={currentSlug}
      editPath={editPath}
      effectiveSlug={effectiveSlug}
      embeddedArticleContent={embeddedArticleContent}
      isAdvanced={isAdvanced}
      isRevising={isRevising}
      isTranslationPending={isTranslationPending}
      isTranslationStale={isTranslationStale}
      lastModified={lastModified}
      locale={locale}
      navigation={navigation}
      profileHandles={profileHandles}
      readingTime={readingTime}
      runningHeadChapterIndex={runningHeadOwner?.index}
      runningHeadChapters={runningHeadChapters}
      runningHeadIsAppendix={isStructuralAppendix}
      runningHeadIsPreface={!!target.isPreface && !runningHeadOwner}
      shikiPlugin={shikiPlugin}
      t={t}
      tArticleMeta={tArticleMeta}
      targetFilePath={target.filePath}
      techArticleJsonLd={techArticleJsonLd}
      translationStatus={translationStatus}
      wordCount={wordCount}
      author={author}
    />
  )
}

interface ArticlePageContentProps {
  articleTitle: string
  author: string | undefined
  bannerAlt: string
  bannerPath: string | null
  bannerPreloadHref: string | null
  breadcrumbJsonLd: object
  canonicalUrl: string
  contentLocale: ArticleLocale
  createdAt: string | undefined
  currentSlug: string
  editPath: string
  effectiveSlug: string
  embeddedArticleContent: string
  isAdvanced: boolean
  isRevising: boolean
  isTranslationPending: boolean
  isTranslationStale: boolean
  lastModified: string | undefined
  locale: ArticleLocale
  navigation: Awaited<ReturnType<typeof getArticleNavigation>>
  profileHandles: string[]
  readingTime: number
  runningHeadChapterIndex: number | undefined
  runningHeadChapters: Awaited<ReturnType<typeof getNavigationBreadcrumbs>>
  runningHeadIsAppendix: boolean
  runningHeadIsPreface: boolean
  shikiPlugin: Awaited<ReturnType<typeof getCachedRehypeShiki>>
  t: Awaited<ReturnType<typeof getTranslations>>
  tArticleMeta: Awaited<ReturnType<typeof getTranslations>>
  targetFilePath: string
  techArticleJsonLd: object
  translationStatus: NonNullable<Awaited<ReturnType<typeof getArticleContentBySlug>>>["translationStatus"]
  wordCount: number
}

function ArticlePageContent({
  articleTitle,
  author,
  bannerAlt,
  bannerPath,
  bannerPreloadHref,
  breadcrumbJsonLd,
  canonicalUrl,
  contentLocale,
  createdAt,
  currentSlug,
  editPath,
  effectiveSlug,
  embeddedArticleContent,
  isAdvanced,
  isRevising,
  isTranslationPending,
  isTranslationStale,
  lastModified,
  locale,
  navigation,
  profileHandles,
  readingTime,
  runningHeadChapterIndex,
  runningHeadChapters,
  runningHeadIsAppendix,
  runningHeadIsPreface,
  shikiPlugin,
  t,
  tArticleMeta,
  targetFilePath,
  techArticleJsonLd,
  translationStatus,
  wordCount,
}: ArticlePageContentProps) {
  return (
    <div className="border-tech-main/30 bg-surface/80 relative min-h-screen min-w-0 border p-6 backdrop-blur-sm sm:p-8">
      {bannerPreloadHref ? <link rel="preload" as="image" href={bannerPreloadHref} fetchPriority="high" /> : null}
      <BookmarkRecorder slug={currentSlug} title={articleTitle} />
      {runningHeadChapters.length > 0 && <RunningHead chapters={runningHeadChapters} articleSlug={effectiveSlug} articleTitle={articleTitle} locale={locale} chapterIndex={runningHeadChapterIndex} chapterIsAppendix={runningHeadIsAppendix} isPreface={runningHeadIsPreface} />}
      {author && createdAt && lastModified ? <ArticleMetadataFull title={articleTitle} author={profileHandles[0] ?? author} coAuthors={profileHandles.slice(1)} createdAt={createdAt} lastModified={lastModified} canonicalUrl={canonicalUrl} filePath={targetFilePath} wordCount={wordCount} readingTime={readingTime} editPath={editPath} isAdvanced={isAdvanced} isRevising={isRevising} bannerPath={bannerPath} bannerAlt={bannerAlt} /> : <ArticleMetadataAnonymous title={articleTitle} canonicalUrl={canonicalUrl} attributionDate={lastModified || createdAt} filePath={targetFilePath} wordCount={wordCount} readingTime={readingTime} isAdvanced={isAdvanced} isRevising={isRevising} bannerPath={bannerPath} bannerAlt={bannerAlt} />}
      <TranslationNotices contentLocale={contentLocale} effectiveSlug={effectiveSlug} isTranslationPending={isTranslationPending} isTranslationStale={isTranslationStale} t={t} translationStatus={translationStatus} />
      <article lang={contentLocale} className="article-prose min-w-0" data-article-content><MarkdownRenderer content={embeddedArticleContent} locale={locale} rawPath={targetFilePath} shikiPlugin={shikiPlugin} headingAction={COPY_PAGE_ACTION} /></article>
      <ChapterEndMark isAdvanced={isAdvanced} />
      {(navigation.prev || navigation.next) && <ArticleNavigation locale={locale} next={navigation.next} nextLabel={tArticleMeta("next")} prev={navigation.prev} prevLabel={tArticleMeta("prev")} />}
      <Suspense><ArticleHighlight /></Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={serializeJsonLd(techArticleJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={serializeJsonLd(breadcrumbJsonLd)} />
    </div>
  )
}

function TranslationNotices({
  contentLocale,
  effectiveSlug,
  isTranslationPending,
  isTranslationStale,
  t,
  translationStatus,
}: Pick<ArticlePageContentProps, "contentLocale" | "effectiveSlug" | "isTranslationPending" | "isTranslationStale" | "t" | "translationStatus">) {
  return (
    <>
      {isTranslationPending ? <aside data-testid="translation-pending-notice" aria-labelledby="translation-pending-label" className="mt-4 border border-amber-500/40 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100"><p id="translation-pending-label" data-testid="translation-pending-badge" className="font-mono text-[0.625rem] tracking-[0.2em] text-amber-700 uppercase dark:text-amber-300">{t("translationPending")}</p><p className="mt-2 text-sm/relaxed">{t("translationFallbackBody")}</p><a href={`/${contentLocale}/articles/${encodeSlug(effectiveSlug)}`} className="mt-3 inline-flex min-h-11 items-center font-mono text-xs tracking-wider text-amber-900 underline decoration-amber-700/50 underline-offset-4 transition-colors hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-amber-100 dark:hover:text-amber-300 dark:focus-visible:outline-amber-300">{t("translationFallbackCta")} →</a></aside> : null}
      {isTranslationStale && translationStatus ? <aside data-testid="translation-stale-badge" aria-labelledby="translation-outdated-label" className="mt-4 border border-amber-500/40 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100"><p id="translation-outdated-label" className="font-mono text-[0.625rem] tracking-[0.2em] text-amber-700 uppercase dark:text-amber-300">{t("translationOutdatedLabel")}</p><p className="mt-2 text-sm/relaxed">{t("translationOutdatedPrefix")} <a href={translationStatus.latestOriginalCommitUrl} target="_blank" rel="noreferrer" aria-label={t("translationLatestCommitAria", { sha: translationStatus.latestOriginalRevision.slice(0, 7) })} className="font-mono underline decoration-amber-700/50 underline-offset-4 transition-colors hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:hover:text-amber-300 dark:focus-visible:outline-amber-300">{translationStatus.latestOriginalRevision.slice(0, 7)}</a>{". "}{t("translationOutdatedLag", { commitLag: translationStatus.commitLag, dayLag: translationStatus.dayLag })}</p></aside> : null}
    </>
  )
}

function normalizeDraftTargetPath(filePath: string) {
  if (filePath === "README.md" || filePath.endsWith("/README.md")) {
    return filePath
  }

  return filePath.replace(/\.md$/, "")
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

function buildArticleStructuredData({
  articleTitle,
  authorArray,
  bannerUrl,
  canonicalUrl,
  chapterTitle,
  createdAt,
  description,
  effectiveSlug,
  isAdvanced,
  lastModified,
  locale,
  readingTime,
  runningHeadChapters,
  siteUrl,
  wordCount,
}: {
  articleTitle: string
  authorArray: Array<{ "@type": "Person"; "@id": string; name: string; url: string }>
  bannerUrl: string | null
  canonicalUrl: string
  chapterTitle: string | undefined
  createdAt: string | undefined
  description: string
  effectiveSlug: string
  isAdvanced: boolean
  lastModified: string | undefined
  locale: ArticleLocale
  readingTime: number
  runningHeadChapters: Awaited<ReturnType<typeof getNavigationBreadcrumbs>>
  siteUrl: string
  wordCount: number
}) {
  const techArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle" as const,
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
  const breadcrumbChapterItems = runningHeadChapters.flatMap((chapter, index) =>
    chapter.slug === effectiveSlug
      ? []
      : [{
          "@type": "ListItem" as const,
          position: index + 3,
          name: chapter.title,
          item: `${siteUrl}/${locale}${articleUrl(chapter.slug)}`,
        }]
  )
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList" as const,
    itemListElement: [
      { "@type": "ListItem" as const, position: 1, name: "Home", item: `${siteUrl}/${locale}` },
      { "@type": "ListItem" as const, position: 2, name: "Articles", item: `${siteUrl}/${locale}/articles` },
      ...breadcrumbChapterItems,
      {
        "@type": "ListItem" as const,
        position: breadcrumbChapterItems.length + 3,
        name: articleTitle,
        item: canonicalUrl,
      },
    ],
  }

  return { breadcrumbJsonLd, techArticleJsonLd }
}
