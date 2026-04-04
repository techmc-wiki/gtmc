import path from "path"
import { createHash } from "crypto"

export interface ParsedImageRef {
  url: string
  storagePath: string
  filename: string
  mimeType?: string
}

export interface MigrationTarget {
  storagePath: string
  assetId: string
  repoPath: string
}

export interface MigrationAssetInput {
  id: string
  storagePath: string
  filename: string
  contentHash?: string | null
}

const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(([^)]+)\)/g

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
}

function splitDestinationAndTitle(raw: string) {
  const trimmed = raw.trim()

  if (trimmed.startsWith("<")) {
    const closing = trimmed.indexOf(">")
    if (closing > 0) {
      return {
        destinationToken: trimmed.slice(0, closing + 1),
        trailing: trimmed.slice(closing + 1),
      }
    }
  }

  const whitespaceIdx = trimmed.search(/\s/)
  if (whitespaceIdx < 0) {
    return {
      destinationToken: trimmed,
      trailing: "",
    }
  }

  return {
    destinationToken: trimmed.slice(0, whitespaceIdx),
    trailing: trimmed.slice(whitespaceIdx),
  }
}

function unwrapDestinationToken(token: string): string {
  const trimmed = token.trim()
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function inferMimeTypeFromFilename(filename: string): string | undefined {
  const ext = path.posix.extname(filename).toLowerCase().slice(1)
  return EXT_TO_MIME[ext]
}

function stripQueryAndHash(url: string): string {
  const hashIdx = url.indexOf("#")
  const queryIdx = url.indexOf("?")

  let end = url.length
  if (hashIdx >= 0) end = Math.min(end, hashIdx)
  if (queryIdx >= 0) end = Math.min(end, queryIdx)
  return url.slice(0, end)
}

function extractStoragePathFromUrl(url: string, normalizedPrefix: string) {
  const cleanUrl = stripQueryAndHash(url)
  const marker = `/${normalizedPrefix}/`
  const markerIdx = cleanUrl.indexOf(marker)

  if (markerIdx < 0) return null

  const storagePath = cleanUrl.slice(markerIdx + 1)
  if (!storagePath.startsWith(`${normalizedPrefix}/`)) return null

  return storagePath
}

function stableSuffixFromStoragePath(storagePath: string): string {
  return createHash("sha256").update(storagePath).digest("hex").slice(0, 12)
}

function withDeterministicSuffix(filename: string, suffix: string): string {
  const safeFilename = path.posix.basename(filename)
  const ext = path.posix.extname(safeFilename)
  const stem = ext ? safeFilename.slice(0, -ext.length) : safeFilename
  return `${stem}-${suffix}${ext}`
}

export function parseDraftTempImageRefs(
  markdown: string,
  storageTempPrefix: string
): ParsedImageRef[] {
  const normalizedPrefix = storageTempPrefix.replace(/^\/+|\/+$/g, "")
  if (!normalizedPrefix) return []

  const refs: ParsedImageRef[] = []

  for (const match of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
    const rawDestination = match[1]
    if (!rawDestination) continue

    const { destinationToken } = splitDestinationAndTitle(rawDestination)
    const url = unwrapDestinationToken(destinationToken)
    const storagePath = extractStoragePathFromUrl(url, normalizedPrefix)
    if (!storagePath) continue

    const filename = decodeURIComponent(path.posix.basename(storagePath))
    refs.push({
      url,
      storagePath,
      filename,
      mimeType: inferMimeTypeFromFilename(filename),
    })
  }

  return refs
}

export function computeChapterImagePath(
  articleFilePath: string,
  assetFilename: string
): string {
  const normalizedArticlePath = articleFilePath.replace(/^\/+/, "")
  const articleDir = path.posix.dirname(normalizedArticlePath)
  const safeFilename = path.posix.basename(assetFilename)
  const imgDir = articleDir === "." ? "img" : path.posix.join(articleDir, "img")
  return path.posix.join(imgDir, safeFilename)
}

export function rewriteDraftTempUrls(
  markdown: string,
  urlToRepoPath: Map<string, string>
): string {
  if (urlToRepoPath.size === 0) return markdown

  return markdown.replace(
    MARKDOWN_IMAGE_RE,
    (fullMatch, rawDestination: string) => {
      const { destinationToken, trailing } =
        splitDestinationAndTitle(rawDestination)
      const originalUrl = unwrapDestinationToken(destinationToken)
      const rewrittenPath = urlToRepoPath.get(originalUrl)

      if (!rewrittenPath) return fullMatch

      const nextToken = destinationToken.trim().startsWith("<")
        ? `<${rewrittenPath}>`
        : rewrittenPath

      return fullMatch.replace(rawDestination, `${nextToken}${trailing}`)
    }
  )
}

export function buildMigrationTargets(
  articleFilePath: string,
  assets: MigrationAssetInput[]
): MigrationTarget[] {
  const byBasePath = new Map<string, MigrationAssetInput[]>()

  for (const asset of assets) {
    const basePath = computeChapterImagePath(articleFilePath, asset.filename)
    const key = basePath.toLowerCase()
    const group = byBasePath.get(key)
    if (group) {
      group.push(asset)
    } else {
      byBasePath.set(key, [asset])
    }
  }

  const targets: MigrationTarget[] = []

  for (const group of byBasePath.values()) {
    if (group.length === 1) {
      const only = group[0]
      targets.push({
        storagePath: only.storagePath,
        assetId: only.id,
        repoPath: computeChapterImagePath(articleFilePath, only.filename),
      })
      continue
    }

    const sorted = [...group].sort((a, b) => {
      const aKey = `${a.contentHash ?? ""}:${a.storagePath}:${a.id}`
      const bKey = `${b.contentHash ?? ""}:${b.storagePath}:${b.id}`
      return aKey.localeCompare(bKey)
    })

    const usedRepoPaths = new Set<string>()

    for (const asset of sorted) {
      const baseSuffix = (
        asset.contentHash || stableSuffixFromStoragePath(asset.storagePath)
      ).slice(0, 12)

      let attempt = 1
      let repoPath = computeChapterImagePath(
        articleFilePath,
        withDeterministicSuffix(
          asset.filename,
          attempt === 1 ? baseSuffix : `${baseSuffix}-${attempt}`
        )
      )

      while (usedRepoPaths.has(repoPath.toLowerCase())) {
        attempt += 1
        repoPath = computeChapterImagePath(
          articleFilePath,
          withDeterministicSuffix(asset.filename, `${baseSuffix}-${attempt}`)
        )
      }

      usedRepoPaths.add(repoPath.toLowerCase())
      targets.push({
        storagePath: asset.storagePath,
        assetId: asset.id,
        repoPath,
      })
    }
  }

  return targets
}
