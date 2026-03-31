import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const EXT_TO_INLINE_MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rawPath = req.nextUrl.searchParams.get("path")
  if (!rawPath) {
    return NextResponse.json(
      { error: "Missing path parameter" },
      { status: 400 }
    )
  }

  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(rawPath)
  } catch {
    return NextResponse.json(
      { error: "Invalid path encoding" },
      { status: 400 }
    )
  }

  decodedPath = decodedPath.replace(/\/+/g, "/")

  if (decodedPath.includes("..") || decodedPath.includes("\\")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  const match = decodedPath.match(/^data\/(images|videos|files)\/([^/]+)$/)
  if (!match) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  const safeCategory = match[1]
  const safeFilename = match[2]

  // Map category through an explicit allow-list to avoid using tainted input directly
  const allowedCategories: Record<string, string> = {
    images: "images",
    videos: "videos",
    files: "files",
  }
  const normalizedCategory = allowedCategories[safeCategory]
  if (!normalizedCategory) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  // Enforce a conservative allow-list for filenames to harden against SSRF
  // Only allow alphanumerics, dot, underscore, and hyphen, and disallow leading dots.
  if (
    !/^[A-Za-z0-9._-]+$/.test(safeFilename) ||
    safeFilename.startsWith(".")
  ) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  // Derive MIME from extension — GitHub's CDN returns application/octet-stream
  const pathExt = safeFilename.split(".").pop()?.toLowerCase() || ""
  const derivedMime = EXT_TO_INLINE_MIME[pathExt]

  const ownerStr = process.env.GITHUB_REPO_OWNER
  const repoStr = process.env.GITHUB_REPO_NAME
  const token = process.env.GITHUB_FEATURES_ISSUES_PAT

  if (!ownerStr || !repoStr || !token) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const owner = encodeURIComponent(ownerStr)
  const repo = encodeURIComponent(repoStr)
  // Safely construct the URL to prevent SSRF
  const githubUrl = new URL(
    `/${owner}/${repo}/main/data/${normalizedCategory}/${encodeURIComponent(safeFilename)}`,
    "https://raw.githubusercontent.com"
  ).toString()

  const fetchHeaders: Record<string, string> = {
    Authorization: `token ${token}`,
  }
  const rangeHeader = req.headers.get("range")
  if (rangeHeader) {
    fetchHeaders["Range"] = rangeHeader
  }

  let upstream: Response
  try {
    upstream = await fetch(githubUrl, { headers: fetchHeaders })
  } catch {
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 })
  }

  if (!upstream.ok && upstream.status !== 206) {
    if (upstream.status === 404) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 })
  }

  if (!derivedMime) {
    return NextResponse.redirect(githubUrl, 302)
  }

  const responseHeaders = new Headers()
  responseHeaders.set("Content-Type", derivedMime)
  responseHeaders.set("Content-Disposition", "inline")
  responseHeaders.set("X-Content-Type-Options", "nosniff")

  const upstreamContentLength = upstream.headers.get("content-length")
  if (upstreamContentLength) {
    responseHeaders.set("Content-Length", upstreamContentLength)
  }

  const acceptRanges = upstream.headers.get("accept-ranges")
  if (acceptRanges) {
    responseHeaders.set("Accept-Ranges", acceptRanges)
  } else {
    responseHeaders.set("Accept-Ranges", "bytes")
  }

  const contentRange = upstream.headers.get("content-range")
  if (contentRange) {
    responseHeaders.set("Content-Range", contentRange)
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
