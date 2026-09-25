/**
 * Reads locale metadata through a JSON import so this helper remains client-safe.
 */
import manifestData from "@/data/manifest.json"

type ArticleLocale = "en" | "zh"

interface ArticleManifestEntry {
  availableLocales: ArticleLocale[]
  localizedFilePaths: Partial<Record<ArticleLocale, string>>
}

const manifest = manifestData as Record<string, ArticleManifestEntry>

export function hasArticleLocale(slug: string, locale: ArticleLocale): boolean {
  return manifest[slug]?.availableLocales.includes(locale) ?? false
}

export function getArticleAvailableLocales(slug: string): ArticleLocale[] {
  return manifest[slug]?.availableLocales ?? []
}

