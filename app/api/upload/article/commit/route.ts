import { NextRequest, NextResponse } from "next/server"
import { del } from "@vercel/blob"

import { auth } from "@/lib/auth"
import { getGithubPatForUser } from "@/lib/auth-context"
import { classifyFile, sanitizeFilename } from "@/lib/file-upload"
import {
  uploadArticleAssetToGithub,
  ArticleAssetUploadError,
} from "@/lib/github/articles-assets"

const MAX_FILE_BYTES = 50 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let blobUrl: string | undefined

  try {
    const body = await req.json()
    blobUrl = body.blobUrl
    const filename = body.filename
    const mimeType = body.mimeType

    if (!blobUrl || typeof blobUrl !== "string") {
      return NextResponse.json({ error: "Missing blobUrl" }, { status: 400 })
    }

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 })
    }

    if (!mimeType || typeof mimeType !== "string") {
      return NextResponse.json({ error: "Missing mimeType" }, { status: 400 })
    }

    const classification = classifyFile(mimeType)
    if (!classification) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      )
    }

    const blobHostname = process.env.BLOB_STORE_HOSTNAME
    const rawBlobPathPrefix = process.env.BLOB_STORE_PATH_PREFIX || "/"
    if (!blobHostname) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      )
    }

    const blobPathPrefix = rawBlobPathPrefix.startsWith("/")
      ? rawBlobPathPrefix
      : `/${rawBlobPathPrefix}`

    const parsedUrl = new URL(blobUrl)

    const pathSegments = parsedUrl.pathname.split("/")
    const hasPathTraversal = pathSegments.some((segment) => segment === "..")

    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname !== blobHostname ||
      parsedUrl.port !== "" ||
      hasPathTraversal
    ) {
      return NextResponse.json({ error: "Invalid blob URL" }, { status: 400 })
    }

    const normalizedPath = new URL(parsedUrl.pathname, "https://blob.invalid")
      .pathname
    if (!normalizedPath.startsWith(blobPathPrefix)) {
      return NextResponse.json({ error: "Invalid blob URL" }, { status: 400 })
    }

    const relativePath = normalizedPath.slice(blobPathPrefix.length)
    if (!relativePath || relativePath.startsWith("/")) {
      return NextResponse.json({ error: "Invalid blob URL" }, { status: 400 })
    }

    const relativeSegments = relativePath.split("/")
    const hasInvalidSegment = relativeSegments.some((segment) => {
      return (
        !segment ||
        segment === "." ||
        segment === ".." ||
        !/^[A-Za-z0-9._-]+$/.test(segment)
      )
    })
    if (hasInvalidSegment) {
      return NextResponse.json({ error: "Invalid blob URL" }, { status: 400 })
    }

    const safePath = blobPathPrefix + relativePath
    const safeBlobUrl = new URL(safePath, `https://${blobHostname}`).toString()

    const blobResponse = await fetch(safeBlobUrl, { redirect: "error" })
    if (!blobResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch uploaded file" },
        { status: 502 }
      )
    }

    const contentLength = blobResponse.headers.get("content-length")
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    const buffer = Buffer.from(await blobResponse.arrayBuffer())

    if (buffer.length > classification.maxBytes) {
      const maxMB = Math.round(classification.maxBytes / (1024 * 1024))
      return NextResponse.json(
        { error: `File too large (max ${maxMB}MB).` },
        { status: 400 }
      )
    }

    const sanitized = sanitizeFilename(filename, mimeType)
    const token = (await getGithubPatForUser(session.user.id)) ?? null
    const url = await uploadArticleAssetToGithub({
      buffer,
      category: classification.category,
      filename: sanitized,
      token,
    })

    del(blobUrl).catch(() => {})

    return NextResponse.json({
      success: true,
      url,
      filename: sanitized,
      mimeType,
      fileSize: buffer.length,
      category: classification.category,
      proxyable: classification.proxyable,
    })
  } catch (error) {
    if (blobUrl) {
      del(blobUrl).catch(() => {})
    }

    if (error instanceof ArticleAssetUploadError) {
      if (error.code === "CONFIG_MISSING") {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (error.code === "AUTH_FAILED") {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }

      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    console.error("Article asset commit error:", error)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}
