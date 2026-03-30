import type { MetadataRoute } from "next"
import fs from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"
import { getRepoContentTree, type RepoTreeNode } from "@/lib/github-pr"
import { listAllIssues } from "@/lib/github-features"

export const dynamic = "force-dynamic"
export const revalidate = 3600

const filePathToSlug: Record<string, string> = (() => {
  try {
    const slugMapPath = path.join(process.cwd(), "lib/slug-map.json")
    const raw = fs.readFileSync(slugMapPath, "utf-8")
    const slugMap = JSON.parse(raw) as Record<string, string>
    const inverted: Record<string, string> = {}
    for (const [slugKey, filePath] of Object.entries(slugMap)) {
      inverted[filePath.replace(/\.md$/i, "")] = slugKey
    }
    return inverted
  } catch {
    return {}
  }
})()

function flattenLeafSlugs(nodes: RepoTreeNode[]): string[] {
  return nodes.flatMap((n) =>
    n.isFolder && n.children ? flattenLeafSlugs(n.children) : [n.slug]
  )
}

function encodeSlug(slug: string): string {
  return slug.split("/").map(encodeURIComponent).join("/")
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE = "https://beta.techmc.wiki"
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
  const dbUrls: MetadataRoute.Sitemap = dbArticles.map((a) => {
    seenSlugs.add(a.slug)
    return {
      url: `${BASE}/articles/${encodeSlug(a.slug)}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }
  })

  let repoUrls: MetadataRoute.Sitemap = []
  try {
    const tree = await getRepoContentTree()
    const leafSlugs = flattenLeafSlugs(tree)
    repoUrls = leafSlugs
      .map((filePath) => filePathToSlug[filePath])
      .filter(
        (slug): slug is string => slug !== undefined && !seenSlugs.has(slug)
      )
      .map((slug) => ({
        url: `${BASE}/articles/${encodeSlug(slug)}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }))
  } catch {
    /* GitHub API unavailable — skip */
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

  return [...staticUrls, ...dbUrls, ...repoUrls, ...featureUrls]
}
