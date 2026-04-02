import type { MetadataRoute } from "next"
import path from "path"
import { execSync } from "child_process"
import { prisma } from "@/lib/prisma"

import { listAllIssues } from "@/lib/github"
import { getSiteUrl } from "@/lib/site-url"
import { shouldIgnoreFile } from "@/lib/article-ignore"

export const dynamic = "force-dynamic"
export const revalidate = 3600

function encodeSlug(slug: string): string {
  return slug.split("/").map(encodeURIComponent).join("/")
}

function getArticleLastModified(filePath: string): Date {
  try {
    const articlesDir = path.join(process.cwd(), "articles")
    const result = execSync(`git log -1 --format="%ai" -- "${filePath}"`, {
      cwd: articlesDir,
      encoding: "utf-8",
    })
    return result.trim() ? new Date(result.trim()) : new Date()
  } catch {
    return new Date()
  }
}

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
