import path from "path"

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
  const normalized = path.normalize(rawPath).replaceAll("\\", "/")

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
