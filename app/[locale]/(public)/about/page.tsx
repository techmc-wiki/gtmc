import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { PageHeader } from "@/components/ui/headings"
import { toAbsoluteUrl, getSiteUrl } from "@/lib/site-url"
import {
  getManifestStats,
  loadArticleManifest,
  type ManifestStats,
} from "@/lib/articles/manifest"
import {
  getArticlesByAuthor,
  getUniqueAuthors,
  resolveAuthorPerson,
} from "@/lib/articles/person-resolver"
import { buildWebPageJsonLd, serializeJsonLd } from "@/lib/seo/json-ld"
import type { ArticleLocale } from "@/lib/articles/manifest"
import type { AuthorGridItem } from "@/components/mdx/author-grid"
import AboutContentEn from "@/content/about/en.mdx"
import AboutContentZh from "@/content/about/zh.mdx"

const PREVIEW_AUTHOR_COUNT = 8

const aboutContentByLocale = {
  en: AboutContentEn,
  zh: AboutContentZh,
} as const

/**
 * Page data builders live at module scope so the render body doesn't
 * construct arrays directly. The page is a server component and renders once
 * per request.
 */
function buildPreviewAuthors(
  articleLocale: ArticleLocale,
  allAuthors: string[],
  manifest: ReturnType<typeof loadArticleManifest>
): AuthorGridItem[] {
  return allAuthors
    .map((handle) => ({
      handle,
      person: resolveAuthorPerson(handle),
      articleCount: getArticlesByAuthor(handle, articleLocale, manifest).length,
    }))
    .toSorted((a, b) => b.articleCount - a.articleCount)
    .slice(0, PREVIEW_AUTHOR_COUNT)
    .map(({ handle, person }) => ({ handle, person }))
}

function buildAboutStats(
  stats: ManifestStats,
  allAuthors: string[],
  locale: string
) {
  return {
    articleCount: String(stats.articleCount),
    contributors: String(allAuthors.length),
    lastRevision: stats.lastRevision
      ? new Date(stats.lastRevision).toLocaleDateString(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—",
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "About" })
  const canonical = toAbsoluteUrl(`/${locale}/about`)

  return {
    title: t("pageTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical,
      languages: {
        en: toAbsoluteUrl("/en/about"),
        zh: toAbsoluteUrl("/zh/about"),
        "x-default": toAbsoluteUrl("/zh/about"),
      },
    },
    openGraph: {
      title: t("pageTitle"),
      description: t("metaDescription"),
      type: "website",
      url: canonical,
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/opengraph-image"],
    },
  }
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const articleLocale = locale as ArticleLocale
  const t = await getTranslations({ locale, namespace: "About" })
  const siteUrl = getSiteUrl()

  const stats = getManifestStats(articleLocale)
  const manifest = loadArticleManifest()
  const allAuthors = getUniqueAuthors(manifest)
  const previewAuthors = buildPreviewAuthors(
    articleLocale,
    allAuthors,
    manifest
  )
  const displayStats = buildAboutStats(stats, allAuthors, locale)

  const jsonLd = serializeJsonLd(
    buildWebPageJsonLd(
      siteUrl,
      `/${locale}/about`,
      t("pageTitle"),
      t("metaDescription")
    )
  )

  const Content = aboutContentByLocale[articleLocale]

  return (
    <div className="page-container-pb">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd} />

      <PageHeader title={t("pageTitle")} topMargin />

      <Content stats={displayStats} previewAuthors={previewAuthors} />
    </div>
  )
}
