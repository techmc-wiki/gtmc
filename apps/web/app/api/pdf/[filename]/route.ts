import { NextResponse } from "next/server"

const IS_ALLOWED_PDF_FILENAME: Record<string, true> = {
  "gtmc-en.pdf": true,
  "gtmc-zh.pdf": true,
}
/**
 * Proxies allowlisted R2 PDFs through this origin so clients need not know the
 * public base URL and canvas reads avoid cross-origin restrictions.
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
    // pdf.js probes without a Range header, so bound that request to prevent an
    // upstream 200 from streaming the entire file before pdf.js cancels it.
    const INITIAL_WINDOW_BYTES = 262144
    const range = _request.headers.get("range")
    const upstream = await fetch(`${baseUrl}/${filename}`, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
      headers: {
        Range: range ?? `bytes=0-${INITIAL_WINDOW_BYTES - 1}`,
      },
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
