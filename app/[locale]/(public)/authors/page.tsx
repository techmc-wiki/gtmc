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
import AuthorsContentEn from "@/content/authors/en.mdx"
import AuthorsContentZh from "@/content/authors/zh.mdx"

const authorsContentByLocale = {
  en: AuthorsContentEn,
  zh: AuthorsContentZh,
} as const

import {
  buildAuthorsStats,
  buildMaintainers,
  buildProfiles,
} from "../_shared/author-page-data"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Authors" })
  const canonical = toAbsoluteUrl(`/${locale}/authors`)

  return {
    title: t("pageTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical,
      languages: {
        en: toAbsoluteUrl("/en/authors"),
        zh: toAbsoluteUrl("/zh/authors"),
        "x-default": toAbsoluteUrl("/zh/authors"),
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

export default async function AuthorsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const articleLocale = locale as ArticleLocale
  const t = await getTranslations({ locale, namespace: "Authors" })
  const siteUrl = getSiteUrl()

  const stats = getManifestStats(articleLocale)
  const manifest = loadArticleManifest()
  const allAuthors = getUniqueAuthors(manifest)

  const [maintainers, profiles] = await Promise.all([
    buildMaintainers(articleLocale),
    buildProfiles(articleLocale, allAuthors, manifest),
  ])

  const displayStats = buildAuthorsStats(allAuthors, stats.articleCount)

  const jsonLd = serializeJsonLd(
    buildWebPageJsonLd(
      siteUrl,
      `/${locale}/authors`,
      t("pageTitle"),
      t("metaDescription")
    )
  )

  const Content = authorsContentByLocale[articleLocale]

  return (
    <div className="page-container-pb">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd} />

      <PageHeader title={t("pageTitle")} topMargin />

      <Content
        stats={displayStats}
        maintainers={maintainers}
        profiles={profiles}
        fallbackBio={t("fallbackBio")}
      />
    </div>
  )
}
