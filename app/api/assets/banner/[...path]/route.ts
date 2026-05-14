import { NextResponse } from "next/server"
import path from "path"
import mime from "mime-types"
import { getArticleRemoteBuffer } from "@/lib/article-remote-assets"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params
  const filePath = pathSegments.join("/")

  if (!filePath) {
    return new NextResponse("Not Found", { status: 404 })
  }

  const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "")
  const safePath = normalizedPath.replace(/^\/+/, "")

  const fileBuffer = await getArticleRemoteBuffer(safePath)
  if (fileBuffer) {
    const mimeType = mime.lookup(safePath) || "application/octet-stream"
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": String(mimeType),
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    })
  }

  return new NextResponse("Not Found", { status: 404 })
}
