import { NextResponse } from "next/server"
import path from "path"
import { getArticleRemoteBuffer } from "@/lib/article-remote-assets"
import { getSiteUrl } from "@/lib/site-url"

const ALLOWED_REMOTE_HOSTNAMES = new Set<string>()
const ALLOWED_REMOTE_PATH_PREFIXES = ["/api/litematica-download/"] as const

let SITE_ORIGIN: URL | null = null

try {
  const siteUrl = new URL(getSiteUrl())
  SITE_ORIGIN = siteUrl
  ALLOWED_REMOTE_HOSTNAMES.add(siteUrl.hostname)
} catch {
  // Ignore malformed site URL and continue with explicit hostname allow-list.
}

function isAllowedRemotePath(pathname: string): boolean {
  return ALLOWED_REMOTE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  )
}

function getAllowedRemotePathAndQuery(urlString: string): string | null {
  try {
    if (!SITE_ORIGIN) {
      return null
    }

    // Only allow same-origin absolute URLs or root-relative paths.
    let pathname = ""
    let search = ""

    if (urlString.startsWith("http://") || urlString.startsWith("https://")) {
      const parsed = new URL(urlString)

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null
      }

      const parsedPort =
        parsed.port ||
        (parsed.protocol === "https:"
          ? "443"
          : parsed.protocol === "http:"
            ? "80"
            : "")

      const sitePort =
        SITE_ORIGIN.port ||
        (SITE_ORIGIN.protocol === "https:"
          ? "443"
          : SITE_ORIGIN.protocol === "http:"
            ? "80"
            : "")

      if (
        parsed.protocol !== SITE_ORIGIN.protocol ||
        parsed.hostname !== SITE_ORIGIN.hostname ||
        parsedPort !== sitePort
      ) {
        return null
      }

      pathname = parsed.pathname
      search = parsed.search
    } else {
      // Disallow protocol-relative URLs and require root-relative path input.
      if (urlString.startsWith("//") || !urlString.startsWith("/")) {
        return null
      }

      const parsedRelative = new URL(urlString, SITE_ORIGIN)
      pathname = parsedRelative.pathname
      search = parsedRelative.search
    }

    // Ensure canonical root-relative path and block suspicious URL characters.
    if (
      !pathname.startsWith("/") ||
      pathname.includes("\\") ||
      /[\u0000-\u001F\u007F]/.test(pathname)
    ) {
      return null
    }

    if (search.includes("#") || /[\u0000-\u001F\u007F]/.test(search)) {
      return null
    }

    const lowerPath = pathname.toLowerCase()
    if (lowerPath.includes("%2f") || lowerPath.includes("%5c")) {
      return null
    }

    // Reject traversal-style path segments, including encoded forms.
    const decodedPath = decodeURIComponent(pathname)
    if (decodedPath.split("/").some((segment) => segment === "..")) {
      return null
    }

    if (!isAllowedRemotePath(pathname)) {
      return null
    }

    return pathname + search
  } catch {
    return null
  }
}

function errorResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  })
}

function normalizeUrlParam(input: string) {
  let value = input
    .replace(/\r?\n/g, "")
    .trim()
    .replace(/^['"]|['"]$/g, "")

  // Accept both raw and pre-encoded values.
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(value)
      if (decoded === value) break
      value = decoded
    } catch {
      break
    }
  }

  return value
}

function normalizeArticleRepoPath(input: string) {
  const withoutQuery = input.split("?")[0]?.split("#")[0] ?? ""
  const normalized = path.posix.normalize(withoutQuery.replace(/\\/g, "/"))
  const safePath = normalized.replace(/^\.\.\/+/, "").replace(/^\/+/, "")

  if (!safePath || safePath.startsWith("../")) {
    return null
  }

  return safePath.startsWith("articles/")
    ? safePath.slice("articles/".length)
    : safePath
}

async function getRemoteLitematicaBuffer(filePath: string) {
  const direct = await getArticleRemoteBuffer(filePath)
  if (direct || !filePath.toLowerCase().endsWith(".zip")) {
    return { buffer: direct, resolvedFromZip: false }
  }

  const siblingLitematicPath = filePath.replace(/\.zip$/i, ".litematic")
  const sibling = await getArticleRemoteBuffer(siblingLitematicPath)
  return { buffer: sibling, resolvedFromZip: Boolean(sibling) }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawUrlParam = searchParams.get("url")

  if (!rawUrlParam) {
    return errorResponse("Missing url parameter", 400)
  }

  const urlParam = normalizeUrlParam(rawUrlParam)

  try {
    if (urlParam.startsWith("http://") || urlParam.startsWith("https://")) {
      const allowedRemotePathAndQuery = getAllowedRemotePathAndQuery(urlParam)
      if (!allowedRemotePathAndQuery || !SITE_ORIGIN) {
        return errorResponse("Remote URL is not allowed", 403)
      }

      const trustedRemoteUrl = new URL(SITE_ORIGIN.origin)
      const validatedPathAndQuery = new URL(
        allowedRemotePathAndQuery,
        SITE_ORIGIN
      )
      trustedRemoteUrl.pathname = validatedPathAndQuery.pathname
      trustedRemoteUrl.search = validatedPathAndQuery.search

      const response = await fetch(trustedRemoteUrl, {
        redirect: "error",
      })
      if (!response.ok) {
        throw new Error("Failed to fetch file: " + response.statusText)
      }

      if (!response.body) {
        throw new Error("Remote file response did not include a body")
      }

      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") || "application/octet-stream",
          "Cache-Control": "public, max-age=86400",
        },
      })
    }

    const articlePath = normalizeArticleRepoPath(urlParam)
    if (!articlePath) {
      return errorResponse("Invalid path", 403)
    }

    const { buffer, resolvedFromZip } =
      await getRemoteLitematicaBuffer(articlePath)

    if (!buffer) {
      return errorResponse("File not found: " + urlParam, 404)
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    }

    if (resolvedFromZip) {
      headers["X-Litematica-Resolved-From-Zip"] = "1"
    }

    return new NextResponse(new Uint8Array(buffer), { headers })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error"
    console.error("Error fetching litematica file:", error)
    return errorResponse(message, 500)
  }
}
