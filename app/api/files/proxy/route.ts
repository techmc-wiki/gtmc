import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const EXT_TO_INLINE_MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
}

const PATH_REGEX = /^data\/(images|videos|files)\/[^/]+$/

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
  }

  const rawPath = req.nextUrl.searchParams.get("path")
  if (!rawPath) {
    return NextResponse.json(
      { error: "Missing path parameter" },
      { status: 400 },
    )
  }

  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(rawPath)
  } catch {
    return NextResponse.json(
      { error: "Invalid path encoding" },
      { status: 400 },
    )
  }

  decodedPath = decodedPath.replace(/\/+/g, "/")

  if (decodedPath.includes("..") || decodedPath.includes("\\")) {
    return NextResponse.json(
      { error: "Invalid path" },
      { status: 400 },
    )
  }

  if (!PATH_REGEX.test(decodedPath)) {
    return NextResponse.json(
      { error: "Invalid path" },
      { status: 400 },
    )
  }

  // Derive MIME from extension — GitHub's CDN returns application/octet-stream
  const pathFilename = decodedPath.split("/").pop() || ""
  const pathExt = pathFilename.split(".").pop()?.toLowerCase() || ""
  const derivedMime = EXT_TO_INLINE_MIME[pathExt]

  const owner = process.env.GITHUB_REPO_OWNER
  const repo = process.env.GITHUB_REPO_NAME
  const token = process.env.GITHUB_FEATURES_ISSUES_PAT

  if (!owner || !repo || !token) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    )
  }

  const githubUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${decodedPath}`

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
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 502 },
    )
  }

  if (!upstream.ok && upstream.status !== 206) {
    if (upstream.status === 404) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 },
      )
    }
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 502 },
    )
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
