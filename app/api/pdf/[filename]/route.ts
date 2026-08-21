import { NextResponse } from "next/server"

const IS_ALLOWED_PDF_FILENAME: Record<string, true> = {
  "gtmc-en.pdf": true,
  "gtmc-zh.pdf": true,
}
/**
 * Proxies the R2-hosted PDF for the cover preview. Keeps the client free of
 * the public base URL and sidesteps CORS on canvas reads.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  if (!IS_ALLOWED_PDF_FILENAME[filename]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_PDF_BASE_URL?.trim().replace(
    /\/+$/,
    ""
  )
  if (!baseUrl) {
    return NextResponse.json(
      { error: "PDF downloads are not configured" },
      { status: 503 }
    )
  }

  try {
    // Pass the browser's Range header through so pdf.js can fetch only
    // the bytes it needs (xref + page 1) instead of the whole ~44 MB file.
    const range = _request.headers.get("range")
    const upstream = await fetch(`${baseUrl}/${filename}`, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
      ...(range ? { headers: { Range: range } } : {}),
    })

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: "Upstream fetch failed" },
        { status: 502 }
      )
    }

    if (!upstream.body) {
      return NextResponse.json(
        { error: "Upstream fetch failed" },
        { status: 502 }
      )
    }

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Cache-Control": "public, max-age=3600",
    })
    const contentRange = upstream.headers.get("content-range")
    if (contentRange) headers.set("Content-Range", contentRange)
    const contentLength = upstream.headers.get("content-length")
    if (contentLength) headers.set("Content-Length", contentLength)
    headers.set("Accept-Ranges", "bytes")

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    })
  } catch {
    return NextResponse.json({ error: "Upstream timeout" }, { status: 504 })
  }
}
