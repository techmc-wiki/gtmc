import fs from "fs"
import path from "path"

export const ARTICLE_BANNER_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=86400"

export function resolveArticleAssetPath(
  assetSrc: string | undefined,
  articleFilePath: string
): string | null {
  if (!assetSrc || typeof assetSrc !== "string") return null

  const trimmedSrc = assetSrc.trim()
  if (!trimmedSrc) return null
  if (isExternalArticleAssetUrl(trimmedSrc)) return trimmedSrc
  if (trimmedSrc.split(/[\\/]+/).includes("..")) return null

  const rawPath = trimmedSrc.startsWith("/")
    ? trimmedSrc.slice(1)
    : path.join(path.dirname(articleFilePath), trimmedSrc)
  const normalized = path.normalize(rawPath).replaceAll('\\', "/")

  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.isAbsolute(normalized)
  ) {
    return null
  }

  return normalized
}

function isExternalArticleAssetUrl(assetSrc: string): boolean {
  return assetSrc.startsWith("https://") || assetSrc.startsWith("http://")
}

export function isLocalArticleAssetPath(assetSrc: string): boolean {
  return !isExternalArticleAssetUrl(assetSrc)
}

export async function readLocalArticleAsset(
  assetPath: string
): Promise<Buffer | null> {
  if (!isLocalArticleAssetPath(assetPath)) return null

  const articlesRoot = path.join(process.cwd(), "articles")
  const localPath = path.join(articlesRoot, assetPath)
  const relativePath = path.relative(articlesRoot, localPath)

  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    return null
  }

  try {
    return await fs.promises.readFile(localPath)
  } catch {
    return null
  }
}
