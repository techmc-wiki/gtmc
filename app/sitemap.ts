import type { MetadataRoute } from "next"

import { listAllIssues } from "@/lib/github"
import { getSiteUrl } from "@/lib/site-url"
import { shouldIgnoreFile } from "@/lib/articles/ignore"
import { encodeSlug } from "@/lib/articles/slug-resolver"
import { getPublicChapterNav } from "@/lib/articles/public-tree"
import {
  loadArticleManifest,
  type ArticleLocale,
} from "@/lib/articles/manifest"
import { loadGlossaryManifest } from "@/lib/glossary/manifest"

export const revalidate = 3600

const STATIC_LAST_MODIFIED = new Date("2024-12-08T10:28:55.000Z")

function localizedAlternates(base: string, path: string) {
  return {
    languages: {
      en: `${base}/en${path}`,
      zh: `${base}/zh${path}`,
    },
  }
}

function lastModifiedFrom(value: string | undefined): Date {
  return value ? new Date(value) : STATIC_LAST_MODIFIED
}

function flattenTree(
  nodes: Awaited<ReturnType<typeof getPublicChapterNav>>
): string[] {
  const slugs: string[] = []
  for (const node of nodes) {
    if (!node.isFolder) {
      slugs.push(node.slug)
    }
    if (node.children.length > 0) {
      slugs.push(...flattenTree(node.children))
    }
  }
  return slugs
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
      url: `${BASE}/zh/features`,
      lastModified: STATIC_LAST_MODIFIED,
      alternates: localizedAlternates(BASE, "/features"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/en/features`,
      lastModified: STATIC_LAST_MODIFIED,
      alternates: localizedAlternates(BASE, "/features"),
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
  ]

  let articleUrls: MetadataRoute.Sitemap = []
  try {
    const manifest = loadArticleManifest()
    const locales: ArticleLocale[] = ["zh", "en"]
    const localizedArticleUrls = await Promise.all(
      locales.map(async (locale) => {
        const tree = await getPublicChapterNav(locale)
        const slugs = flattenTree(tree)
        return slugs
          .filter((slug) => {
            const fileName = slug.split("/").pop() || slug
            return !shouldIgnoreFile(fileName, !slug.includes("/"))
          })
          .map((slug) => ({
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

  let featureUrls: MetadataRoute.Sitemap = []
  try {
    const issues = await listAllIssues()
    featureUrls = issues.flatMap((issue) => [
      {
        url: `${BASE}/zh/features/${issue.number}`,
        lastModified: new Date(issue.updatedAt),
        alternates: localizedAlternates(BASE, `/features/${issue.number}`),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      },
      {
        url: `${BASE}/en/features/${issue.number}`,
        lastModified: new Date(issue.updatedAt),
        alternates: localizedAlternates(BASE, `/features/${issue.number}`),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      },
    ])
  } catch (error) {
    console.warn("Sitemap: skipped feature URLs due to GitHub error:", error)
    /* GitHub API unavailable — skip */
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

  return [...staticUrls, ...articleUrls, ...featureUrls, ...glossaryUrls]
}
