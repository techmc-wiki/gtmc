import { encodeSlug } from "@/lib/articles/slug-resolver"

const ARTICLE_ASSET_PUBLIC_PREFIX = "/article-assets"

export function articleUrl(slug: string): string {
  return `/articles/${encodeSlug(slug)}`
}

export function getArticleAssetPublicUrl(assetPath: string): string {
  if (assetPath.startsWith("https://") || assetPath.startsWith("http://")) {
    return assetPath
  }

  return `${ARTICLE_ASSET_PUBLIC_PREFIX}/${assetPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`
}


