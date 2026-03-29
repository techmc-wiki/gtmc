import { NextRequest, NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { auth } from "@/lib/auth"
import { uploadFileToGithub, GithubFeaturesError } from "@/lib/github-features"
import { classifyFile, isImageMime, sanitizeFilename } from "@/lib/file-upload"

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

    if (!blobUrl || typeof blobUrl !== "string") {
      return NextResponse.json({ error: "Missing blobUrl" }, { status: 400 })
    }
    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 })
    }

    const blobHostname = process.env.BLOB_STORE_HOSTNAME
    const rawBlobPathPrefix = process.env.BLOB_STORE_PATH_PREFIX || "/"
    if (!blobHostname) {
      console.error("BLOB_STORE_HOSTNAME not configured")
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      )
    }
    // Normalize the configured path prefix to always start with a single "/"
    const blobPathPrefix =
      rawBlobPathPrefix.startsWith("/") ? rawBlobPathPrefix : `/${rawBlobPathPrefix}`

    let parsedUrl: URL
    try {
      parsedUrl = new URL(blobUrl)
    } catch {
      return NextResponse.json({ error: "Invalid blob URL" }, { status: 400 })
    }

    // Ensure the URL points to the expected HTTPS blob host only,
    // with no custom port or path traversal, and under an allowed path prefix.
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

    // Normalize the path to eliminate any implicit traversal (e.g. "/a/../b")
    // and ensure it stays within the allowed prefix.
    const normalizedPath = new URL(parsedUrl.pathname, "https://blob.invalid").pathname
    if (!normalizedPath.startsWith(blobPathPrefix)) {
      return NextResponse.json({ error: "Invalid blob URL" }, { status: 400 })
    }

    // Derive the blob path relative to the configured prefix and validate it.
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
        // Only allow safe path characters in each segment
        !/^[A-Za-z0-9._-]+$/.test(segment)
      )
    })
    if (hasInvalidSegment) {
      return NextResponse.json({ error: "Invalid blob URL" }, { status: 400 })
    }

    // Rebuild a safe URL from validated components, dropping any user-controlled
    // query string to avoid influencing the blob backend via arbitrary parameters.
    const safePath = blobPathPrefix + relativePath
    const safeBlobUrlObj = new URL(safePath, `https://${blobHostname}`)
    const safeBlobUrl = safeBlobUrlObj.toString()

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

    const reader = blobResponse.body?.getReader()
    if (!reader) {
      return NextResponse.json(
        { error: "Failed to read uploaded file" },
        { status: 502 }
      )
    }

    const chunks: Uint8Array[] = []
    let totalBytes = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_FILE_BYTES) {
        reader.cancel()
        return NextResponse.json({ error: "File too large" }, { status: 400 })
      }
      chunks.push(value)
    }

    const arrayBuffer = new Uint8Array(totalBytes)
    let offset = 0
    for (const chunk of chunks) {
      arrayBuffer.set(chunk, offset)
      offset += chunk.byteLength
    }

    const rawContentType = blobResponse.headers.get("content-type") || ""
    const derivedMime = rawContentType.split(";")[0].trim().toLowerCase()

    if (!derivedMime) {
      return NextResponse.json(
        { error: "Unable to determine file type" },
        { status: 400 }
      )
    }

    if (isImageMime(derivedMime)) {
      return NextResponse.json(
        { error: "Images must use direct upload" },
        { status: 400 }
      )
    }

    const classification = classifyFile(derivedMime)
    if (!classification) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      )
    }

    if (totalBytes > classification.maxBytes) {
      const maxMB = Math.round(classification.maxBytes / (1024 * 1024))
      return NextResponse.json(
        { error: `File too large (max ${maxMB}MB).` },
        { status: 400 }
      )
    }

    const sanitized = sanitizeFilename(filename, derivedMime)

    const buffer = Buffer.from(arrayBuffer)
    const url = await uploadFileToGithub(
      buffer,
      sanitized,
      derivedMime,
      classification.category
    )

    del(blobUrl).catch((err) => {
      console.error("Failed to delete blob:", err)
    })

    return NextResponse.json({
      success: true,
      url,
      filename: sanitized,
      mimeType: derivedMime,
      fileSize: totalBytes,
      category: classification.category,
      proxyable: classification.proxyable,
    })
  } catch (error) {
    if (blobUrl) {
      del(blobUrl).catch(() => {})
    }

    if (error instanceof GithubFeaturesError) {
      if (error.code === "CONFIG_MISSING") {
        return NextResponse.json(
          { error: "Upload not configured." },
          { status: 500 }
        )
      }
      if (error.code === "AUTH_FAILED") {
        return NextResponse.json(
          { error: "Upload authorization failed." },
          { status: 403 }
        )
      }
      if (error.code === "RATE_LIMITED") {
        return NextResponse.json(
          { error: "Rate limited. Try again shortly." },
          { status: 429 }
        )
      }
    }

    console.error("Commit route error:", error)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}
