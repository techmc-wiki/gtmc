import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const urlParam = searchParams.get("url")

  if (!urlParam) {
    return new NextResponse("Missing url parameter", { status: 400 })
  }

  try {
    // If it's a remote URL, just proxy it
    if (urlParam.startsWith("http://") || urlParam.startsWith("https://")) {
      const response = await fetch(urlParam)
      if (!response.ok)
        throw new Error("Failed to fetch file: " + response.statusText)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Cache-Control": "public, max-age=86400",
        },
      })
    }

    // Local file resolution (e.g. articles/TreeFarm/...litematic)
    const localPath = path.join(process.cwd(), urlParam.replace(/\r?\n/g, ""))

    // Security check to avoid path traversal reading outside the workspace
    const absoluteRoot = process.cwd()
    if (!localPath.startsWith(absoluteRoot)) {
      return new NextResponse("Invalid path", { status: 403 })
    }

    if (!fs.existsSync(localPath)) {
      return new NextResponse("File not found: " + urlParam, { status: 404 })
    }

    const buffer = await fs.promises.readFile(localPath)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error: any) {
    console.error("Error fetching litematica file:", error)
    return new NextResponse(error.message || "Internal Server Error", {
      status: 500,
    })
  }
}
