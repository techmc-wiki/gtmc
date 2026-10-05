import path from "path"

export interface ParsedImageRef {
  url: string
  storagePath: string
  filename: string
  mimeType?: string
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

export function parseImageRefs(
  markdown: string,
  storageTempPrefix: string
): ParsedImageRef[] {
  const normalizedPrefix = storageTempPrefix.replaceAll(/^\/+|\/+$/g, "")
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

export function rewriteImageUrls(
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
