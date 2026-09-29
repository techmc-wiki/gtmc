import type { MetadataRoute } from "next"
import { cacheLife } from "next/cache"

import { getSiteUrl } from "@/lib/site-url"
import { encodeSlug } from "@/lib/articles/slug-resolver"
import { getProfileHandles } from "@/lib/articles/person-resolver"
import {
  loadArticleManifest,
  type ArticleLocale,
} from "@/lib/articles/manifest"
import { loadGlossaryManifest } from "@/lib/glossary/manifest"

const SITE_LOCALES: ArticleLocale[] = ["zh", "en"]

function localizedAlternates(
  base: string,
  path: string,
  locales: readonly ArticleLocale[] = SITE_LOCALES
) {
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, `${base}/${locale}${path}`])
  )
  const defaultLocale = locales.includes("zh") ? "zh" : locales[0]

  if (defaultLocale) {
    languages["x-default"] = `${base}/${defaultLocale}${path}`
  }

  return { languages }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache"
  cacheLife("max")

  const base = getSiteUrl()
  const staticUrls: MetadataRoute.Sitemap = [
    ...SITE_LOCALES.map((locale) => ({
      url: `${base}/${locale}`,
      alternates: localizedAlternates(base, ""),
      changeFrequency: "weekly" as const,
      priority: 1.0,
    })),
    ...SITE_LOCALES.flatMap((locale) => [
      {
        url: `${base}/${locale}/glossary`,
        alternates: localizedAlternates(base, "/glossary"),
        changeFrequency: "weekly" as const,
        priority: 0.9,
      },
      {
        url: `${base}/${locale}/pdf`,
        alternates: localizedAlternates(base, "/pdf"),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      },
      {
        url: `${base}/${locale}/about`,
        alternates: localizedAlternates(base, "/about"),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      {
        url: `${base}/${locale}/authors`,
        alternates: localizedAlternates(base, "/authors"),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
      {
        url: `${base}/${locale}/editorial-policy`,
        alternates: localizedAlternates(base, "/editorial-policy"),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      },
    ]),
  ]

  const manifest = loadArticleManifest()
  const articleUrls = Object.values(manifest).flatMap((entry) => {
    if (entry.isFolder && !entry.hasIntro) return []

    const articlePath = `/articles/${encodeSlug(entry.slug)}`
    return entry.availableLocales.map((locale) => {
      const modifiedValue = entry.lastmodByLocale[locale] ?? entry.created
      const modified = modifiedValue ? new Date(modifiedValue) : undefined

      return {
        url: `${base}/${locale}${articlePath}`,
        ...(modified ? { lastModified: modified } : {}),
        alternates: localizedAlternates(
          base,
          articlePath,
          entry.availableLocales
        ),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }
    })
  })

  const { entries } = await loadGlossaryManifest()
  const glossaryUrls = entries.flatMap((entry) => {
    const path = `/glossary/${encodeURIComponent(entry.slug)}`
    return SITE_LOCALES.map((locale) => ({
      url: `${base}/${locale}${path}`,
      alternates: localizedAlternates(base, path),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  })

  const authorUrls = getProfileHandles().flatMap((handle) => {
    const encoded = encodeURIComponent(handle)
    const path = `/authors/${encoded}`
    return SITE_LOCALES.map((locale) => ({
      url: `${base}/${locale}${path}`,
      alternates: localizedAlternates(base, path),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))
  })

  return [...staticUrls, ...articleUrls, ...glossaryUrls, ...authorUrls]
}
