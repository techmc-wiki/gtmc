/**
 * Client-safe article locale helper functions.
 *
 * Loads article locale data from manifest.json directly (via JSON import),
 * avoiding the `fs` import in article-manifest-store.ts for client bundles.
 */
import manifestData from "@/data/manifest.json"

type ArticleLocale = "en" | "zh"

interface ArticleManifestEntry {
  availableLocales: ArticleLocale[]
  localizedFilePaths: Partial<Record<ArticleLocale, string>>
}

const manifest = manifestData as Record<string, ArticleManifestEntry>

export function hasArticleLocale(
  slug: string,
  locale: ArticleLocale
): boolean {
  return manifest[slug]?.availableLocales.includes(locale) ?? false
}

export function getArticleAvailableLocales(
  slug: string
): ArticleLocale[] {
  return manifest[slug]?.availableLocales ?? []
}

export function getArticleLocalizedFilePath(
  slug: string,
  locale: ArticleLocale
): string | undefined {
  return manifest[slug]?.localizedFilePaths[locale]
}
