import { NextResponse } from "next/server"
import path from "path"
import mime from "mime-types"
import { getArticleRemoteBuffer } from "@/lib/articles/remote-assets"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get("path")

  if (!filePath) {
    return new NextResponse("Not Found", { status: 404 })
  }

  // Prevent directory traversal attacks
  const normalizedPath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "")
  const safePath = normalizedPath.replace(/^\/+/, "")
  const pathsToTry = safePath.endsWith(".md")
    ? [safePath]
    : [safePath, `${safePath}.md`]

  /* oxlint-disable eslint/no-await-in-loop -- sequential: returns on first match, avoids unnecessary fetches */
  for (const candidate of pathsToTry) {
    const fileBuffer = await getArticleRemoteBuffer(candidate)
    if (fileBuffer) {
      const mimeType = mime.lookup(candidate) || "application/octet-stream"
      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          "Content-Type": String(mimeType),
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      })
    }
  }
  /* oxlint-enable eslint/no-await-in-loop */

  return new NextResponse("Not Found", { status: 404 })
}
