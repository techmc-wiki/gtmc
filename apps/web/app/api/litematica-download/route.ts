import { NextResponse } from "next/server"
import path from "path"
import { getRepoFileBuffer } from "@/lib/github/sync"

function errorResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  })
}

function normalizeUrlParam(input: string) {
  let value = input
    .replaceAll(/\r?\n/g, "")
    .trim()
    .replaceAll(/^['"]|['"]$/g, "")

  // Clients may send either raw or pre-encoded URL parameters.
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(value)
      if (decoded === value) break
      value = decoded
    } catch {
      break
    }
  }

  return value
}

function normalizeArticleRepoPath(input: string) {
  const withoutQuery = input.split("?")[0]?.split("#")[0] ?? ""
  const normalized = path.posix.normalize(withoutQuery.replaceAll("\\", "/"))
  const safePath = normalized.replace(/^\.\.\/+/, "").replace(/^\/+/, "")

  if (!safePath || safePath.startsWith("../")) {
    return null
  }

  return safePath.startsWith("articles/")
    ? safePath.slice("articles/".length)
    : safePath
}

async function getRemoteLitematicaBuffer(filePath: string) {
  const direct = await getRepoFileBuffer(filePath)
  if (direct || !filePath.toLowerCase().endsWith(".zip")) {
    return { buffer: direct, resolvedFromZip: false }
  }

  const siblingLitematicPath = filePath.replace(/\.zip$/i, ".litematic")
  const sibling = await getRepoFileBuffer(siblingLitematicPath)
  return { buffer: sibling, resolvedFromZip: Boolean(sibling) }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawUrlParam = searchParams.get("url")

  if (!rawUrlParam) {
    return errorResponse("Missing url parameter", 400)
  }

  const urlParam = normalizeUrlParam(rawUrlParam)

  try {
    if (urlParam.startsWith("http://") || urlParam.startsWith("https://")) {
      return errorResponse("Remote URL is not allowed", 403)
    }

    const articlePath = normalizeArticleRepoPath(urlParam)
    if (!articlePath) {
      return errorResponse("Invalid path", 403)
    }

    const { buffer, resolvedFromZip } =
      await getRemoteLitematicaBuffer(articlePath)

    if (!buffer) {
      return errorResponse("File not found: " + urlParam, 404)
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    }

    if (resolvedFromZip) {
      headers["X-Litematica-Resolved-From-Zip"] = "1"
    }

    return new NextResponse(new Uint8Array(buffer), { headers })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error"
    console.error("Error fetching litematica file:", error)
    return errorResponse(message, 500)
  }
}
