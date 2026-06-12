import type { MetadataRoute } from "next"

import { listAllIssues } from "@/lib/github"
import { getSiteUrl } from "@/lib/site-url"
import { shouldIgnoreFile } from "@/lib/articles/ignore"
import { encodeSlug } from "@/lib/articles/slug-resolver"
import { getPublicChapterNav } from "@/lib/articles/public-tree"
import type { ArticleLocale } from "@/lib/articles/manifest"
import { loadGlossaryManifest } from "@/lib/glossary/manifest"

export const revalidate = 3600

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
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/en`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/zh/features`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/en/features`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/zh/articles`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/en/articles`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/zh/glossary`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/en/glossary`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/zh/pdf`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE}/en/pdf`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ]

  let articleUrls: MetadataRoute.Sitemap = []
  try {
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
            lastModified: new Date(),
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
        changeFrequency: "weekly" as const,
        priority: 0.5,
      },
      {
        url: `${BASE}/en/features/${issue.number}`,
        lastModified: new Date(issue.updatedAt),
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
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
      {
        url: `${BASE}/en/glossary/${entry.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
    ])
  } catch (error) {
    console.warn("Sitemap: skipped glossary URLs due to manifest error:", error)
  }

  return [...staticUrls, ...articleUrls, ...featureUrls, ...glossaryUrls]
}
