import { NextResponse } from "next/server"
import path from "path"
import mime from "mime-types"
import { getArticleRemoteBuffer } from "@/lib/articles/remote-assets"

const ARTICLE_BANNER_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params
  const filePath = pathSegments.join("/")

  if (!filePath) {
    return new NextResponse("Not Found", { status: 404 })
  }

  const normalizedPath = path.normalize(filePath).replaceAll("\\", "/")
  if (
    normalizedPath === ".." ||
    normalizedPath.startsWith("../") ||
    normalizedPath.split(/[\\/]+/).includes("..") ||
    path.isAbsolute(normalizedPath)
  ) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const safePath = normalizedPath.replace(/^\/+/, "")

  const fileBuffer = await getArticleRemoteBuffer(safePath)
  if (fileBuffer) {
    const mimeType = mime.lookup(safePath) || "application/octet-stream"
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": String(mimeType),
        "Cache-Control": ARTICLE_BANNER_CACHE_CONTROL,
      },
    })
  }

  return new NextResponse("Not Found", { status: 404 })
}
