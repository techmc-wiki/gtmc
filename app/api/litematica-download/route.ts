import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getSiteUrl } from "@/lib/site-url"

// Allow-list of hostnames that this API is permitted to proxy requests to.
// Adjust this list as needed for your application.
const ALLOWED_REMOTE_HOSTNAMES = new Set<string>([
  getSiteUrl()
])

function isAllowedRemoteUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString)

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false
    }

    // Only allow explicitly allow-listed hostnames
    return ALLOWED_REMOTE_HOSTNAMES.has(parsed.hostname)
  } catch {
    // Malformed URL
    return false
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const urlParam = searchParams.get("url")

  if (!urlParam) {
    return new NextResponse("Missing url parameter", { status: 400 })
  }

  try {
    // If it's a remote URL, just proxy it (with SSRF protection)
    if (urlParam.startsWith("http://") || urlParam.startsWith("https://")) {
      if (!isAllowedRemoteUrl(urlParam)) {
        return new NextResponse("Remote URL is not allowed", { status: 403 })
      }

      const response = await fetch(urlParam)
      if (!response.ok)
        throw new Error("Failed to fetch file: " + response.statusText)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Cache-Control": "public, max-age=86400",
        },
      })
    }

    // Local file resolution (e.g. articles/TreeFarm/...litematic)
    const localPath = path.join(process.cwd(), urlParam.replace(/\r?\n/g, ""))

    // Security check to avoid path traversal reading outside the workspace
    const absoluteRoot = process.cwd()
    if (!localPath.startsWith(absoluteRoot)) {
      return new NextResponse("Invalid path", { status: 403 })
    }

    if (!fs.existsSync(localPath)) {
      return new NextResponse("File not found: " + urlParam, { status: 404 })
    }

    const buffer = await fs.promises.readFile(localPath)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error"
    console.error("Error fetching litematica file:", error)
    return new NextResponse(message, {
      status: 500,
    })
  }
}
