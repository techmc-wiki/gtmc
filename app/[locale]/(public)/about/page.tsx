import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
// oxlint-disable-next-line import/no-unassigned-import
import "../public-content.css"
import { PageHeader } from "@/components/ui/headings"
import { toAbsoluteUrl, getSiteUrl } from "@/lib/site-url"
import { getManifestStats, loadArticleManifest } from "@/lib/articles/manifest"
import { getUniqueAuthors } from "@/lib/articles/person-resolver"
import { buildWebPageJsonLd, serializeJsonLd } from "@/lib/seo/json-ld"
import type { ArticleLocale } from "@/lib/articles/manifest"
import AboutContentEn from "@/content/about/en.mdx"
import AboutContentZh from "@/content/about/zh.mdx"

const aboutContentByLocale = { en: AboutContentEn, zh: AboutContentZh } as const

import {
  buildAboutStats,
  buildPreviewAuthors,
} from "../_shared/author-page-data"

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
