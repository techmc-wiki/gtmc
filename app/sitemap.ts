import type { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

import { listAllIssues } from "@/lib/github"
import { getSiteUrl } from "@/lib/site-url"
import { shouldIgnoreFile } from "@/lib/article-ignore"
import { encodeSlug } from "@/lib/slug-utils"

export const dynamic = "force-dynamic"
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE = getSiteUrl()
  const seenSlugs = new Set<string>()

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/features`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/articles`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ]

  const dbArticles = await prisma.article.findMany({
    where: { isFolder: false },
    select: { slug: true, updatedAt: true },
  })

  // Filter out ignored articles from DB
  const filteredDbArticles = dbArticles.filter((article) => {
    const fileName = article.slug.split("/").pop() || article.slug
    return !shouldIgnoreFile(fileName, !article.slug.includes("/"))
  })

  const dbUrls: MetadataRoute.Sitemap = filteredDbArticles.map((a) => {
    seenSlugs.add(a.slug)
    return {
      url: `${BASE}/articles/${encodeSlug(a.slug)}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }
  })

  let featureUrls: MetadataRoute.Sitemap = []
  try {
    const issues = await listAllIssues()
    featureUrls = issues.map((issue) => ({
      url: `${BASE}/features/${issue.number}`,
      lastModified: new Date(issue.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }))
  } catch {
    /* GitHub API unavailable — skip */
  }

  return [...staticUrls, ...dbUrls, ...featureUrls]
}
