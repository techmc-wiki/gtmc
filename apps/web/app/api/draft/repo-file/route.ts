import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { getDraftRepoFile } from "@/lib/drafts/storage"

export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const filePath = req.nextUrl.searchParams.get("path")

  if (!filePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 })
  }

  const normalizedPath = filePath.replaceAll("\\", "/").replace(/^\/+/, "")

  if (normalizedPath.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  const content = await getDraftRepoFile(normalizedPath)

  if (content === null) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  return NextResponse.json({ content, filePath: normalizedPath })
}
