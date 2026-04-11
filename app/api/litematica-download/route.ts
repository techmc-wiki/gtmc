import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getSiteUrl } from "@/lib/site-url"

const ALLOWED_REMOTE_HOSTNAMES = new Set<string>()

let SITE_ORIGIN: URL | null = null

try {
  const siteUrl = new URL(getSiteUrl())
  SITE_ORIGIN = siteUrl
  ALLOWED_REMOTE_HOSTNAMES.add(siteUrl.hostname)
} catch {
  // Ignore malformed site URL and continue with explicit hostname allow-list.
}

function isAllowedRemoteUrl(urlString: string) {
  try {
    const parsed = new URL(urlString)

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false
    }

    // Require same-origin with the configured site URL when available.
    if (SITE_ORIGIN) {
      if (parsed.hostname !== SITE_ORIGIN.hostname) {
        return false
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

      if (parsedPort !== sitePort) {
        return false
      }

      return true
    }

    // Fallback: allow only explicitly configured hostnames.
    return ALLOWED_REMOTE_HOSTNAMES.has(parsed.hostname)
  } catch {
    return false
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawUrlParam = searchParams.get("url")

  if (!rawUrlParam) {
    return errorResponse("Missing url parameter", 400)
  }

  const urlParam = normalizeUrlParam(rawUrlParam)

  try {
    if (urlParam.startsWith("http://") || urlParam.startsWith("https://")) {
      if (!isAllowedRemoteUrl(urlParam)) {
        return errorResponse("Remote URL is not allowed", 403)
      }

      const response = await fetch(urlParam)
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

    const absoluteRoot = path.resolve(process.cwd())
    const localPath = path.resolve(absoluteRoot, urlParam)
    const relative = path.relative(absoluteRoot, localPath)

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return errorResponse("Invalid path", 403)
    }

    let resolvedPath = localPath
    let resolvedFromZip = false

    // Compatibility fallback for stale cached article content:
    // if an old .zip path is requested and a sibling .litematic exists,
    // serve the .litematic file instead.
    if (localPath.toLowerCase().endsWith(".zip")) {
      const dirPath = path.dirname(localPath)
      const sameBaseLitematic = localPath.replace(/\.zip$/i, ".litematic")

      if (fs.existsSync(sameBaseLitematic)) {
        resolvedPath = sameBaseLitematic
        resolvedFromZip = true
      } else if (fs.existsSync(dirPath)) {
        const entries = await fs.promises.readdir(dirPath, {
          withFileTypes: true,
        })

        const litematicFiles = entries
          .filter((entry) => entry.isFile() && /\.litematic$/i.test(entry.name))
          .map((entry) => path.join(dirPath, entry.name))

        if (litematicFiles.length === 1) {
          resolvedPath = litematicFiles[0]
          resolvedFromZip = true
        }
      }
    }

    const resolvedRelative = path.relative(absoluteRoot, resolvedPath)
    if (
      resolvedRelative.startsWith("..") ||
      path.isAbsolute(resolvedRelative)
    ) {
      return errorResponse("Invalid path", 403)
    }

    if (!fs.existsSync(resolvedPath)) {
      return errorResponse("File not found: " + urlParam, 404)
    }

    const buffer = await fs.promises.readFile(resolvedPath)
    const headers: Record<string, string> = {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    }

    if (resolvedFromZip) {
      headers["X-Litematica-Resolved-From-Zip"] = "1"
    }

    return new NextResponse(buffer, { headers })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error"
    console.error("Error fetching litematica file:", error)
    return errorResponse(message, 500)
  }
}
