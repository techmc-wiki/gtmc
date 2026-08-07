import { encodeSlug } from "@/lib/articles/slug-resolver"

const ARTICLE_ASSET_PUBLIC_PREFIX = "/article-assets"

/**
 * Constructs a consistent article URL with proper encoding.
 * Encodes each slug segment individually to match tree-node.tsx pattern.
 */
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


