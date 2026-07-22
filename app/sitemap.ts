import type { MetadataRoute } from "next"
import { cacheLife } from "next/cache"

import { getSiteUrl } from "@/lib/site-url"
import { flattenArticleNodes } from "@/lib/articles/navigation-data"
import { encodeSlug } from "@/lib/articles/slug-resolver"
import { getPublicChapterNav } from "@/lib/articles/public-tree"
import { getProfileHandles } from "@/lib/articles/person-resolver"
import {
  loadArticleManifest,
  type ArticleLocale,
} from "@/lib/articles/manifest"
import { loadGlossaryManifest } from "@/lib/glossary/manifest"

const STATIC_LAST_MODIFIED = new Date("2024-12-08T10:28:55.000Z")

function localizedAlternates(base: string, path: string) {
  return {
    languages: {
      en: `${base}/en${path}`,
      zh: `${base}/zh${path}`,
      "x-default": `${base}/zh${path}`,
    },
  }
}

function lastModifiedFrom(value: string | undefined): Date {
  return value ? new Date(value) : STATIC_LAST_MODIFIED
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache"
  cacheLife("hours")

  const BASE = getSiteUrl()

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/zh`,
      lastModified: STATIC_LAST_MODIFIED,
      alternates: localizedAlternates(BASE, ""),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/en`,
      lastModified: STATIC_LAST_MODIFIED,
      alternates: localizedAlternates(BASE, ""),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/zh/articles`,
      lastModified: STATIC_LAST_MODIFIED,
      alternates: localizedAlternates(BASE, "/articles"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/en/articles`,
      lastModified: STATIC_LAST_MODIFIED,
      alternates: localizedAlternates(BASE, "/articles"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/zh/glossary`,
      lastModified: STATIC_LAST_MODIFIED,
      alternates: localizedAlternates(BASE, "/glossary"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/en/glossary`,
      lastModified: STATIC_LAST_MODIFIED,
      alternates: localizedAlternates(BASE, "/glossary"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/zh/pdf`,
      lastModified: STATIC_LAST_MODIFIED,
      alternates: localizedAlternates(BASE, "/pdf"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE}/en/pdf`,
      lastModified: STATIC_LAST_MODIFIED,
      alternates: localizedAlternates(BASE, "/pdf"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE}/zh/about`,
      alternates: localizedAlternates(BASE, "/about"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE}/en/about`,
      alternates: localizedAlternates(BASE, "/about"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE}/zh/authors`,
      alternates: localizedAlternates(BASE, "/authors"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE}/en/authors`,
      alternates: localizedAlternates(BASE, "/authors"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE}/zh/editorial-policy`,
      alternates: localizedAlternates(BASE, "/editorial-policy"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/en/editorial-policy`,
      alternates: localizedAlternates(BASE, "/editorial-policy"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ]

  let articleUrls: MetadataRoute.Sitemap = []
  try {
    const manifest = loadArticleManifest()
    const locales: ArticleLocale[] = ["zh", "en"]
    const localizedArticleUrls = await Promise.all(
      locales.map(async (locale) => {
        const tree = await getPublicChapterNav(locale)
        const slugs = flattenArticleNodes(tree).map((node) => node.slug)
        return slugs.map((slug) => ({
          url: `${BASE}/${locale}/articles/${encodeSlug(slug)}`,
          lastModified: lastModifiedFrom(
            manifest[slug]?.lastmodByLocale[locale] ?? manifest[slug]?.created
          ),
          alternates: localizedAlternates(
            BASE,
            `/articles/${encodeSlug(slug)}`
          ),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }))
      })
    )
    articleUrls = localizedArticleUrls.flat()
  } catch (error) {
    console.warn("Sitemap: skipped article URLs due to tree error:", error)
    /* Sidebar tree unavailable — skip articles */
  }

  let glossaryUrls: MetadataRoute.Sitemap = []
  try {
    const { entries } = await loadGlossaryManifest()
    glossaryUrls = entries.flatMap((entry) => [
      {
        url: `${BASE}/zh/glossary/${entry.slug}`,
        lastModified: STATIC_LAST_MODIFIED,
        alternates: localizedAlternates(BASE, `/glossary/${entry.slug}`),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
      {
        url: `${BASE}/en/glossary/${entry.slug}`,
        lastModified: STATIC_LAST_MODIFIED,
        alternates: localizedAlternates(BASE, `/glossary/${entry.slug}`),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
    ])
  } catch (error) {
    console.warn("Sitemap: skipped glossary URLs due to manifest error:", error)
  }

  let authorUrls: MetadataRoute.Sitemap = []
  try {
    const handles = getProfileHandles()
    authorUrls = handles.flatMap((handle) => {
      const encoded = encodeURIComponent(handle)
      const path = `/authors/${encoded}`
      return [
        {
          url: `${BASE}/zh${path}`,
          alternates: localizedAlternates(BASE, path),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        },
        {
          url: `${BASE}/en${path}`,
          alternates: localizedAlternates(BASE, path),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        },
      ]
    })
  } catch (error) {
    console.warn("Sitemap: skipped author URLs due to resolver error:", error)
  }

  return [...staticUrls, ...articleUrls, ...glossaryUrls, ...authorUrls]
}
