import type { MetadataRoute } from "next"

import { listAllIssues } from "@/lib/github"
import { getSiteUrl } from "@/lib/site-url"
import { shouldIgnoreFile } from "@/lib/article-ignore"
import { encodeSlug } from "@/lib/slug-utils"
import { getSidebarTree } from "@/actions/sidebar"

export const dynamic = "force-dynamic"
export const revalidate = 3600

function flattenTree(
  nodes: Awaited<ReturnType<typeof getSidebarTree>>
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

  let articleUrls: MetadataRoute.Sitemap = []
  try {
    const tree = await getSidebarTree()
    const slugs = flattenTree(tree)
    articleUrls = slugs
      .filter((slug) => {
        const fileName = slug.split("/").pop() || slug
        return !shouldIgnoreFile(fileName, !slug.includes("/"))
      })
      .map((slug) => ({
        url: `${BASE}/articles/${encodeSlug(slug)}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }))
  } catch {
    /* Sidebar tree unavailable — skip articles */
  }

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

  return [...staticUrls, ...articleUrls, ...featureUrls]
}
